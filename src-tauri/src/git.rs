use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Commit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub refs: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphLine {
    pub prefix: String,
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub refs: String,
}

fn git(cwd: &str, args: &[&str]) -> anyhow::Result<String> {
    let out = Command::new("git").args(args).current_dir(cwd).output()?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(anyhow::anyhow!("{}", String::from_utf8_lossy(&out.stderr).trim()))
    }
}

pub fn is_git_repo(path: &str) -> bool {
    Command::new("git")
        .args(["rev-parse", "--git-dir"])
        .current_dir(path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[allow(dead_code)]
pub fn get_main_branch(repo_path: &str) -> anyhow::Result<String> {
    git(repo_path, &["symbolic-ref", "--short", "HEAD"])
}

pub fn create_worktree(repo_path: &str, branch: &str, worktree_path: &str) -> anyhow::Result<()> {
    if let Some(parent) = std::path::Path::new(worktree_path).parent() {
        std::fs::create_dir_all(parent)?;
    }

    let has_commits = Command::new("git")
        .args(["rev-parse", "--verify", "HEAD"])
        .current_dir(repo_path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !has_commits {
        git(repo_path, &["commit", "--allow-empty", "-m", "init"])?;
    }

    // Clone with shared object store — each task gets a standalone git repo
    // that shares objects with the parent (no disk duplication)
    Command::new("git")
        .args(["clone", "--shared", repo_path, worktree_path])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| anyhow::anyhow!("failed to clone repo: {}", e))?;

    // Checkout task branch
    git(worktree_path, &["checkout", "-b", branch])?;
    Ok(())
}

#[allow(dead_code)]
pub fn remove_worktree(_repo_path: &str, worktree_path: &str) -> anyhow::Result<()> {
    let _ = std::fs::remove_dir_all(worktree_path);
    Ok(())
}

pub fn get_log(worktree_path: &str, base_branch: &str) -> anyhow::Result<Vec<Commit>> {
    let current = git(worktree_path, &["symbolic-ref", "--short", "HEAD"])
        .unwrap_or_else(|_| "HEAD".to_string());

    let range = format!("{}..{}", base_branch, current);
    let fmt = "--format=%H%x00%s%x00%an%x00%ai%x00%D%x00";

    let raw = Command::new("git")
        .args(["log", &range, fmt])
        .current_dir(worktree_path)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_else(|| {
            // Fallback: last 20 commits
            Command::new("git")
                .args(["log", "-20", fmt])
                .current_dir(worktree_path)
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                .unwrap_or_default()
        });

    let mut commits = Vec::new();
    for block in raw.trim().split("\x00\x00").filter(|s| !s.trim().is_empty()) {
        let parts: Vec<&str> = block.splitn(5, '\x00').collect();
        if parts.len() >= 4 {
            commits.push(Commit {
                hash: parts[0].trim().to_string(),
                message: parts[1].trim().to_string(),
                author: parts[2].trim().to_string(),
                date: parts[3].trim().to_string(),
                refs: parts.get(4).unwrap_or(&"").trim().to_string(),
            });
        }
    }
    Ok(commits)
}

pub fn get_diff(worktree_path: &str, commit_hash: &str) -> anyhow::Result<String> {
    git(worktree_path, &["show", commit_hash, "--stat", "--patch"])
}

pub fn get_file_diff(worktree_path: &str, file_path: &str) -> anyhow::Result<String> {
    let result = git(worktree_path, &["diff", "HEAD", "--no-color", "--", file_path])?;
    if !result.is_empty() {
        return Ok(result);
    }
    // For untracked files: show the full content as a new file
    let full_path = format!("{}/{}", worktree_path, file_path);
    let path = std::path::Path::new(&full_path);
    if path.exists() {
        let content = std::fs::read_to_string(path)
            .unwrap_or_default();
        if !content.is_empty() {
            return Ok(format!(
                "diff --git a/{} b/{}\nnew file mode 100644\nindex 0000000..0000000\n--- /dev/null\n+++ b/{}\n@@ -0,0 +1,{} @@\n{}",
                file_path, file_path, file_path,
                content.lines().count(),
                content.lines()
                    .map(|l| format!("+{}", l))
                    .collect::<Vec<_>>()
                    .join("\n")
            ));
        }
    }
    Ok(result)
}

pub fn get_files(worktree_path: &str) -> anyhow::Result<Vec<FileStatus>> {
    let out = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(worktree_path)
        .output()?;

    let raw = String::from_utf8_lossy(&out.stdout);
    let mut files = Vec::new();

    for line in raw.lines() {
        if line.len() < 4 {
            continue;
        }
        let xy = &line[..2];
        let path = line[3..].trim().to_string();
        let status = if xy.contains('M') {
            "M"
        } else if xy.contains('A') {
            "A"
        } else if xy.contains('D') {
            "D"
        } else if xy.contains('R') {
            "R"
        } else {
            "?"
        };
        files.push(FileStatus { path, status: status.to_string() });
    }
    Ok(files)
}

pub fn commit_worktree(worktree_path: &str, message: &str) -> anyhow::Result<()> {
    git(worktree_path, &["add", "-A"])?;
    git(worktree_path, &["commit", "-m", message])?;
    Ok(())
}

pub fn get_current_branch(worktree_path: &str) -> String {
    git(worktree_path, &["symbolic-ref", "--short", "HEAD"]).unwrap_or_else(|_| "HEAD".to_string())
}

pub fn get_graph(worktree_path: &str) -> anyhow::Result<Vec<GraphLine>> {
    // ── Pass 1: graph structure + short hash + message + refs (--oneline preserves / and \ chars) ──
    let graph_raw = Command::new("git")
        .args([
            "log",
            "--graph",
            "--oneline",
            "--decorate",
            "-30",
            "--all",
        ])
        .current_dir(worktree_path)
        .output()
        .map_err(|e| anyhow::anyhow!("git log --graph failed: {}", e))?
        .stdout;

    // ── Pass 2: author + date + full hash lookup by short hash ──
    let author_raw = Command::new("git")
        .args([
            "log",
            "--all",
            "-30",
            "--format=@@%H@@%h@@%an@@%ai",
        ])
        .current_dir(worktree_path)
        .output()
        .map_err(|e| anyhow::anyhow!("git log author lookup failed: {}", e))?
        .stdout;

    // Build lookup: short_hash → (full_hash, author, date)
    let mut meta: HashMap<String, (String, String, String)> = HashMap::new();
    for line in String::from_utf8_lossy(&author_raw).lines() {
        let parts: Vec<&str> = line.split("@@").collect();
        if parts.len() >= 5 {
            meta.insert(
                parts[2].to_string(),              // short hash
                (parts[1].to_string(), parts[3].to_string(), parts[4].to_string()), // full, author, date
            );
        }
    }

    let text = String::from_utf8_lossy(&graph_raw);
    let mut lines = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim_end();
        if trimmed.is_empty() { continue; }

        // Find the boundary between graph prefix and commit data.
        // Graph chars: *, |, /, \, space. Commit data starts at first alphanumeric.
        let mut prefix_end = trimmed.len();
        for (i, ch) in trimmed.char_indices() {
            if ch.is_ascii_alphanumeric() {
                prefix_end = i;
                break;
            }
        }

        let is_graph_only = prefix_end == trimmed.len();

        if is_graph_only {
            // Pure graph line (e.g. "|/  " or "|\  "), no commit data attached
            lines.push(GraphLine {
                prefix: trimmed.to_string(),
                hash: String::new(),
                short_hash: String::new(),
                message: String::new(),
                author: String::new(),
                date: String::new(),
                refs: String::new(),
            });
            continue;
        }

        let prefix = trimmed[..prefix_end].to_string();
        let rest = trimmed[prefix_end..].trim();

        // Parse oneline: "<hash> (<refs>) <message>" or "<hash> <message>"
        let hash_end = rest.find(' ').unwrap_or(rest.len());
        let short_hash = rest[..hash_end].to_string();
        let tail = rest[hash_end..].trim();

        let mut refs = String::new();
        let message = if tail.starts_with('(') {
            if let Some(close) = tail.find(") ") {
                refs = tail[1..close].to_string();
                tail[close + 2..].to_string()
            } else if tail.ends_with(')') {
                refs = tail[1..tail.len() - 1].to_string();
                String::new()
            } else {
                tail.to_string()
            }
        } else {
            tail.to_string()
        };

        let (full_hash, author, date) = meta
            .get(&short_hash)
            .cloned()
            .unwrap_or_else(|| (short_hash.clone(), String::new(), String::new()));

        lines.push(GraphLine {
            prefix,
            hash: full_hash,
            short_hash,
            message,
            author,
            date,
            refs,
        });
    }

    Ok(lines)
}

pub fn detect_default_branch(repo_path: &str) -> String {
    // Try origin/HEAD first (most reliable)
    if let Ok(out) = git(repo_path, &["symbolic-ref", "--short", "origin/HEAD"]) {
        if let Some(local) = out.strip_prefix("origin/") {
            return local.to_string();
        }
    }
    // Fallback: check if main or master exists locally
    for candidate in &["main", "master"] {
        if Command::new("git")
            .args(["show-ref", "--verify", "--quiet", &format!("refs/heads/{}", candidate)])
            .current_dir(repo_path)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
        {
            return candidate.to_string();
        }
    }
    // Last resort
    "main".to_string()
}

pub fn merge_to_main(
    repo_path: &str,
    worktree_path: &str,
    branch: &str,
    target_branch: &str,
) -> anyhow::Result<()> {
    // Fetch the task branch from the clone into the original repo
    git(repo_path, &["fetch", worktree_path, branch])?;

    // Switch to target branch in the original repo, then merge FETCH_HEAD
    let merge_out = Command::new("git")
        .args(["checkout", target_branch, "--"])
        .current_dir(repo_path)
        .output()
        .map_err(|e| anyhow::anyhow!("checkout failed: {}", e))?;

    if !merge_out.status.success() {
        let stderr = String::from_utf8_lossy(&merge_out.stderr);
        return Err(anyhow::anyhow!("{}", stderr.trim()));
    }

    let merge_out = Command::new("git")
        .args(["merge", "--no-edit", "FETCH_HEAD"])
        .current_dir(repo_path)
        .output()
        .map_err(|e| anyhow::anyhow!("merge failed: {}", e))?;

    if !merge_out.status.success() {
        let stderr = String::from_utf8_lossy(&merge_out.stderr);
        // Abort to leave repo clean on conflict
        let _ = Command::new("git")
            .args(["merge", "--abort"])
            .current_dir(repo_path)
            .output();
        return Err(anyhow::anyhow!("{}", stderr.trim()));
    }

    Ok(())
}
