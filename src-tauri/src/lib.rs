mod db;
mod git;
mod pty_mgr;

use std::sync::Mutex;
use tauri::{AppHandle, State};
use uuid::Uuid;

pub struct AppState {
    pub db: db::Database,
    pub pty: Mutex<pty_mgr::PtyManager>,
}

// ── Repos ─────────────────────────────────────────────────────────────────────

#[tauri::command]
fn list_repos(state: State<'_, AppState>) -> Result<Vec<db::Repo>, String> {
    state.db.list_repos().map_err(|e| e.to_string())
}

#[tauri::command]
fn touch_repo(state: State<'_, AppState>, repo_path: String) -> Result<db::Repo, String> {
    state.db.touch_repo(&repo_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_repo(state: State<'_, AppState>, repo_path: String) -> Result<(), String> {
    state.db.delete_repo(&repo_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn validate_repo(repo_path: String) -> bool {
    git::is_git_repo(&repo_path)
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

#[tauri::command]
fn list_tasks(state: State<'_, AppState>, repo_path: String) -> Result<Vec<db::Task>, String> {
    state.db.list_tasks(&repo_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_task(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<db::Task, String> {
    let id = Uuid::new_v4().to_string();
    let slug = name.to_lowercase().replace(' ', "-");
    let branch = format!("task/{}-{}", slug, &id[..6]);
    let worktree_path = format!("{}/.worktrees/{}", repo_path, id);

    git::create_worktree(&repo_path, &branch, &worktree_path).map_err(|e| e.to_string())?;

    state
        .db
        .create_task(&id, &repo_path, &name, &branch, &worktree_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_task(state: State<'_, AppState>, task_id: String) -> Result<(), String> {
    let task = state.db.get_task(&task_id).map_err(|e| e.to_string())?;

    if let Some(t) = task {
        state.pty.lock().unwrap().kill(&task_id);
        let _ = git::remove_worktree(&t.repo_path, &t.worktree_path);
    }

    state.db.delete_task(&task_id).map_err(|e| e.to_string())
}

// ── PTY (ttyd) ────────────────────────────────────────────────────────────────

#[tauri::command]
fn pty_spawn(
    state: State<'_, AppState>,
    task_id: String,
    worktree_path: String,
) -> Result<u16, String> {
    // Lock briefly just to start the process and record the session
    let port = state
        .pty
        .lock()
        .unwrap()
        .start(task_id, worktree_path)
        .map_err(|e| e.to_string())?;

    // Wait for ttyd to be ready outside the lock so other commands can proceed
    pty_mgr::wait_ready(port, 5000).map_err(|e| e.to_string())?;

    Ok(port)
}

#[tauri::command]
fn pty_kill(state: State<'_, AppState>, task_id: String) {
    state.pty.lock().unwrap().kill(&task_id);
}

// ── Git ───────────────────────────────────────────────────────────────────────

#[tauri::command]
fn git_log(
    worktree_path: String,
    base_branch: Option<String>,
) -> Result<Vec<git::Commit>, String> {
    git::get_log(&worktree_path, base_branch.as_deref().unwrap_or("main"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn git_diff(worktree_path: String, commit_hash: String) -> Result<String, String> {
    git::get_diff(&worktree_path, &commit_hash).map_err(|e| e.to_string())
}

#[tauri::command]
fn git_files(worktree_path: String) -> Result<Vec<git::FileStatus>, String> {
    git::get_files(&worktree_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn git_commit(worktree_path: String, message: String) -> Result<(), String> {
    git::commit_worktree(&worktree_path, &message).map_err(|e| e.to_string())
}

#[tauri::command]
fn git_merge(
    worktree_path: String,
    branch: String,
    target_branch: Option<String>,
) -> Result<(), String> {
    git::merge_to_main(
        &worktree_path,
        &branch,
        target_branch.as_deref().unwrap_or("main"),
    )
    .map_err(|e| e.to_string())
}

// ── Shell / FS ────────────────────────────────────────────────────────────────

#[tauri::command]
fn open_vscode(worktree_path: String) -> Result<(), String> {
    std::process::Command::new("code")
        .args(["--new-window", &worktree_path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn dialog_open_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app.dialog().file().blocking_pick_folder();
    Ok(path.map(|p| p.to_string()))
}

#[derive(serde::Serialize)]
pub struct DirEntry {
    name: String,
    path: String,
}

#[derive(serde::Serialize)]
pub struct BrowseResult {
    current: String,
    parent: Option<String>,
    dirs: Vec<DirEntry>,
}

#[tauri::command]
fn fs_browse(path: Option<String>) -> Result<BrowseResult, String> {
    use std::path::Path;

    let dir = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/")));

    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut dirs: Vec<DirEntry> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().map(|t| t.is_dir()).unwrap_or(false)
                && !e.file_name().to_string_lossy().starts_with('.')
        })
        .map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            let path = e.path().to_string_lossy().to_string();
            DirEntry { name, path }
        })
        .collect();
    dirs.sort_by(|a, b| a.name.cmp(&b.name));

    let parent = dir
        .parent()
        .filter(|p| *p != Path::new(&dir))
        .map(|p| p.to_string_lossy().to_string());

    Ok(BrowseResult {
        current: dir.to_string_lossy().to_string(),
        parent,
        dirs,
    })
}

// ── Entry ─────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        db: db::Database::new().expect("db init"),
        pty: Mutex::new(pty_mgr::PtyManager::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            list_repos,
            touch_repo,
            delete_repo,
            validate_repo,
            list_tasks,
            create_task,
            delete_task,
            pty_spawn,
            pty_kill,
            git_log,
            git_diff,
            git_files,
            git_commit,
            git_merge,
            open_vscode,
            dialog_open_folder,
            fs_browse,
        ])
        .run(tauri::generate_context!())
        .expect("error running AgentSwarm");
}
