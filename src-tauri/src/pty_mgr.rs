use std::collections::HashMap;
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct TtydSession {
    child: Child,
    pub port: u16,
}

pub struct PtyManager {
    sessions: HashMap<String, TtydSession>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self { sessions: HashMap::new() }
    }

    // Starts ttyd and stores the child. Returns port immediately without waiting.
    pub fn start(&mut self, task_id: String, worktree_path: String) -> anyhow::Result<u16> {
        self.kill(&task_id);

        let port = free_port()?;
        let ttyd = resolve_ttyd()?;

        let child = Command::new(&ttyd)
            .args([
                "--interface", "127.0.0.1",
                "--port", &port.to_string(),
                "--writable",
                "sh", "-c", "claude; exec $SHELL",
            ])
            .current_dir(&worktree_path)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| anyhow::anyhow!("failed to spawn ttyd ({}): {}", ttyd, e))?;

        self.sessions.insert(task_id, TtydSession { child, port });
        Ok(port)
    }

    pub fn kill(&mut self, task_id: &str) {
        if let Some(mut s) = self.sessions.remove(task_id) {
            let _ = s.child.kill();
        }
    }
}

// Block until ttyd is accepting connections (called outside the mutex lock).
pub fn wait_ready(port: u16, timeout_ms: u64) -> anyhow::Result<()> {
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    while Instant::now() < deadline {
        if TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(80));
    }
    Err(anyhow::anyhow!("ttyd did not start within {}ms on port {}", timeout_ms, port))
}

fn free_port() -> anyhow::Result<u16> {
    let l = std::net::TcpListener::bind("127.0.0.1:0")?;
    Ok(l.local_addr()?.port())
}

fn resolve_ttyd() -> anyhow::Result<String> {
    // Check common install locations including ~/.local/bin
    let candidates = [
        "ttyd",
        "/usr/local/bin/ttyd",
        "/usr/bin/ttyd",
    ];
    for c in &candidates {
        if Command::new(c).arg("--version").output().map(|o| o.status.success()).unwrap_or(false) {
            return Ok(c.to_string());
        }
    }
    // Check ~/.local/bin
    if let Some(home) = dirs::home_dir() {
        let p = home.join(".local/bin/ttyd");
        if p.exists() {
            return Ok(p.to_string_lossy().to_string());
        }
    }
    Err(anyhow::anyhow!(
        "ttyd not found. Install with: sudo apt install ttyd\nor download from https://github.com/tsl0922/ttyd/releases"
    ))
}
