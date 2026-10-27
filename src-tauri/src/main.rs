// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::net::UdpSocket;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
fn get_windows_hardware_id() -> String {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("wmic")
            .args(["csproduct", "get", "uuid"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("uuid") {
                    return trimmed.to_string();
                }
            }
        }
    }
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "WIN-ENTERPRISE-NODE".to_string())
}

#[tauri::command]
fn get_local_lan_ip() -> String {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                return local_addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

fn spawn_local_central_server() {
    std::thread::spawn(|| {
        let possible_paths = [
            "dist/server.cjs",
            "../dist/server.cjs",
            "resources/dist/server.cjs",
            "server.cjs",
        ];

        for script_path in possible_paths.iter() {
            if std::path::Path::new(script_path).exists() {
                let mut cmd = Command::new("node");
                cmd.arg(script_path)
                    .env("NODE_ENV", "production")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null());

                #[cfg(target_os = "windows")]
                {
                    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                }

                let _ = cmd.spawn();
                break;
            }
        }
    });
}

fn main() {
    // Automatically start embedded central server in background if available on host
    spawn_local_central_server();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_windows_hardware_id,
            get_local_lan_ip
        ])
        .run(tauri::generate_context!())
        .expect("error while running AnbarMeh tauri application");
}
