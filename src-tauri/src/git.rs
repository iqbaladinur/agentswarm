use serde::{Deserialize, Serialize};
use std::process::Command;

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

    git(repo_path, &["worktree", "add", "-b", branch, worktree_path, "HEAD"])?;
    Ok(())
}

pub fn remove_worktree(repo_path: &str, worktree_path: &str) -> anyhow::Result<()> {
    git(repo_path, &["worktree", "remove", "--force", worktree_path])?;
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
    let raw = Command::new("git")
        .args([
            "log",
            "--graph",
            "--format=%H%x00%h%x00%s%x00%an%x00%ai%x00%D",
            "-30",
            "--all",
        ])
        .current_dir(worktree_path)
        .output()
        .map_err(|e| anyhow::anyhow!("git log --graph failed: {}", e))?
        .stdout;

    let text = String::from_utf8_lossy(&raw);
    let mut lines = Vec::new();

    for line in text.lines() {
        // Split at \x00 — left is graph prefix, right is structured data
        if let Some(null_pos) = line.find('\x00') {
            let prefix = line[..null_pos].to_string();
            let data = &line[null_pos + 1..];
            let parts: Vec<&str> = data.splitn(6, '\x00').collect();
            if parts.len() >= 5 {
                lines.push(GraphLine {
                    prefix,
                    hash: parts[0].to_string(),
                    short_hash: parts[1].to_string(),
                    message: parts[2].to_string(),
                    author: parts[3].to_string(),
                    date: parts[4].to_string(),
                    refs: parts.get(5).unwrap_or(&"").to_string(),
                });
            }
        }
    }

    Ok(lines)
}

pub fn merge_to_main(
    worktree_path: &str,
    branch: &str,
    target_branch: &str,
) -> anyhow::Result<()> {
    git(worktree_path, &["checkout", target_branch])?;
    git(worktree_path, &["merge", branch])?;
    git(worktree_path, &["checkout", branch])?;
    Ok(())
}
