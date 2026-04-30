use std::collections::HashMap;
use std::io::{Read, Write};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
pub struct PtyOutputPayload {
    #[serde(rename = "taskId")]
    pub task_id: String,
    pub data: String,
}

#[derive(Serialize, Clone)]
pub struct PtyExitPayload {
    #[serde(rename = "taskId")]
    pub task_id: String,
    #[serde(rename = "exitCode")]
    pub exit_code: i32,
}

pub struct PtySession {
    write_tx: std::sync::mpsc::SyncSender<Vec<u8>>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    // Keep child alive so the process isn't orphaned on drop
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct PtyManager {
    sessions: HashMap<String, PtySession>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self { sessions: HashMap::new() }
    }

    pub fn spawn(
        &mut self,
        task_id: String,
        worktree_path: String,
        app: AppHandle,
    ) -> anyhow::Result<()> {
        self.kill(&task_id);

        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows: 40,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(&worktree_path);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair.slave.spawn_command(cmd)?;
        let mut reader = pair.master.try_clone_reader()?;
        let mut writer = pair.master.take_writer()?;

        let (write_tx, write_rx) = std::sync::mpsc::sync_channel::<Vec<u8>>(256);

        // Writer thread: auto-launch claude then drain the channel
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(300));
            let _ = writer.write_all(b"claude\r");
            for data in write_rx {
                if writer.write_all(&data).is_err() {
                    break;
                }
            }
        });

        // Reader thread: forward PTY output as Tauri events
        let task_id_r = task_id.clone();
        std::thread::spawn(move || {
            let mut buf = vec![0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => {
                        let _ = app.emit("pty:exit", PtyExitPayload {
                            task_id: task_id_r.clone(),
                            exit_code: 0,
                        });
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app.emit("pty:output", PtyOutputPayload {
                            task_id: task_id_r.clone(),
                            data,
                        });
                    }
                }
            }
        });

        self.sessions.insert(task_id, PtySession {
            write_tx,
            master: pair.master,
            _child: child,
        });

        Ok(())
    }

    pub fn write(&self, task_id: &str, data: &[u8]) {
        if let Some(s) = self.sessions.get(task_id) {
            let _ = s.write_tx.send(data.to_vec());
        }
    }

    pub fn resize(&self, task_id: &str, cols: u16, rows: u16) {
        if let Some(s) = self.sessions.get(task_id) {
            let _ = s.master.resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            });
        }
    }

    pub fn kill(&mut self, task_id: &str) {
        self.sessions.remove(task_id);
    }
}
