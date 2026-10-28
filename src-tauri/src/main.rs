// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW_AND_DETACHED: u32 = 0x08000000 | 0x00000008;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW_FLAG: u32 = 0x08000000;

fn is_local_port_listening(port: u16) -> bool {
    let addr_str = format!("127.0.0.1:{}", port);
    if let Ok(addr) = addr_str.parse::<SocketAddr>() {
        if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(400)) {
            let _ = stream.set_read_timeout(Some(Duration::from_millis(450)));
            let _ = stream.set_write_timeout(Some(Duration::from_millis(450)));
            let req = format!(
                "GET / HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\n\r\n",
                port
            );
            if stream.write_all(req.as_bytes()).is_ok() {
                let mut buf = [0u8; 2048];
                if let Ok(n) = stream.read(&mut buf) {
                    if n > 0 {
                        let resp = String::from_utf8_lossy(&buf[..n]);
                        // If an older headless node.exe process is running without the Web UI, restart it
                        if resp.contains("AnbarMeh Central SQL Server is active.") {
                            #[cfg(target_os = "windows")]
                            {
                                let _ = Command::new("wmic")
                                    .args([
                                        "process",
                                        "where",
                                        "name='node.exe' and commandline like '%server.cjs%'",
                                        "call",
                                        "terminate",
                                    ])
                                    .creation_flags(CREATE_NO_WINDOW_FLAG)
                                    .output();
                            }
                            return false;
                        }
                    }
                }
            }
            return true;
        }
    }
    false
}

#[tauri::command]
fn get_windows_hardware_id() -> String {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("wmic")
            .args(["csproduct", "get", "uuid"])
            .creation_flags(CREATE_NO_WINDOW_FLAG)
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty()
                    && !trimmed.eq_ignore_ascii_case("uuid")
                    && trimmed != "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF"
                {
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
fn get_windows_hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "WIN-SERVER-PC".to_string())
}

fn is_valid_lan_ipv4(ip: &str) -> bool {
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() != 4 {
        return false;
    }
    let nums: Result<Vec<u8>, _> = parts.iter().map(|s| s.parse::<u8>()).collect();
    if let Ok(octets) = nums {
        if octets[0] == 127 || octets[0] == 0 {
            return false;
        }
        if octets[0] == 169 && octets[1] == 254 {
            return false;
        }
        return true;
    }
    false
}

#[tauri::command]
fn get_all_lan_ips() -> Vec<String> {
    let mut ips: Vec<String> = Vec::new();

    // 1. Fast UDP socket routing check (no packet sent over network, instant kernel lookup)
    for target in ["192.168.1.1:80", "8.8.8.8:80", "10.0.0.1:80"] {
        if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
            if socket.connect(target).is_ok() {
                if let Ok(local_addr) = socket.local_addr() {
                    let ip_str = local_addr.ip().to_string();
                    if is_valid_lan_ipv4(&ip_str) && !ips.contains(&ip_str) {
                        ips.push(ip_str);
                    }
                }
            }
        }
    }

    // 2. Parse Windows `ipconfig` output to capture all LAN adapters (works even on offline factory switches)
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("ipconfig")
            .creation_flags(CREATE_NO_WINDOW_FLAG)
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let lower = line.to_lowercase();
                if lower.contains("ipv4") || lower.contains("ip address") {
                    if let Some(colon_idx) = line.find(':') {
                        let candidate = line[colon_idx + 1..]
                            .trim()
                            .trim_end_matches("(Preferred)")
                            .trim();
                        if is_valid_lan_ipv4(candidate) && !ips.contains(&candidate.to_string()) {
                            ips.push(candidate.to_string());
                        }
                    }
                }
            }
        }
    }

    ips.sort_by_key(|ip| {
        if ip.starts_with("192.168.") {
            0
        } else if ip.starts_with("10.") {
            1
        } else {
            2
        }
    });

    ips
}

#[tauri::command]
fn get_local_lan_ip() -> String {
    let ips = get_all_lan_ips();
    ips.into_iter().next().unwrap_or_else(|| "192.168.1.100".to_string())
}

fn find_server_cjs_path() -> Option<(PathBuf, PathBuf)> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("dist").join("server.cjs"));
        candidates.push(cwd.join("..").join("dist").join("server.cjs"));
        candidates.push(cwd.join("server.cjs"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("..").join("..").join("..").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("..").join("..").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("..").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("resources").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("_up_").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("server.cjs"));
        }
    }

    for path in candidates {
        if path.exists() {
            if let Ok(canonical) = fs::canonicalize(&path) {
                let clean_str = canonical.to_string_lossy().replace("\\\\?\\", "");
                let clean_path = PathBuf::from(clean_str);
                let work_dir = clean_path
                    .parent()
                    .and_then(|p| {
                        if p.ends_with("dist") {
                            p.parent()
                        } else {
                            Some(p)
                        }
                    })
                    .map(|p| p.to_path_buf())
                    .unwrap_or_else(|| PathBuf::from("."));
                return Some((clean_path, work_dir));
            }
        }
    }

    None
}

fn write_port_to_config_files(effective_port: u16, lan_ip: Option<&str>) {
    let mut data_dirs: Vec<PathBuf> = Vec::new();
    if let Some((_, work_dir)) = find_server_cjs_path() {
        data_dirs.push(work_dir.join("data"));
    }
    if let Ok(cwd) = std::env::current_dir() {
        let cwd_data = cwd.join("data");
        if !data_dirs.contains(&cwd_data) {
            data_dirs.push(cwd_data);
        }
    }
    for d in &data_dirs {
        let _ = fs::create_dir_all(d);
        let cfg_file = d.join("server_node_config.json");
        let mut obj = serde_json::Map::new();
        if cfg_file.exists() {
            if let Ok(content) = fs::read_to_string(&cfg_file) {
                if let Ok(serde_json::Value::Object(existing)) = serde_json::from_str(&content) {
                    obj = existing;
                }
            }
        }
        obj.insert(
            "configuredPort".to_string(),
            serde_json::Value::Number(serde_json::Number::from(effective_port)),
        );
        if let Some(ip) = lan_ip {
            obj.insert("customLanIp".to_string(), serde_json::Value::String(ip.to_string()));
        }
        let _ = fs::write(&cfg_file, serde_json::to_string_pretty(&obj).unwrap_or_default());
    }
}

fn find_configured_port() -> u16 {
    let mut check_paths: Vec<PathBuf> = Vec::new();
    if let Some((_, work_dir)) = find_server_cjs_path() {
        check_paths.push(work_dir.join("data").join("server_node_config.json"));
    }
    if let Ok(cwd) = std::env::current_dir() {
        check_paths.push(cwd.join("data").join("server_node_config.json"));
    }
    for p in check_paths {
        if p.exists() {
            if let Ok(content) = fs::read_to_string(p) {
                if let Some(pos) = content.find("\"configuredPort\"") {
                    let rest = &content[pos..];
                    if let Some(colon) = rest.find(':') {
                        let num_part = rest[colon + 1..]
                            .chars()
                            .skip_while(|c| c.is_whitespace())
                            .take_while(|c| c.is_ascii_digit())
                            .collect::<String>();
                        if let Ok(val) = num_part.parse::<u16>() {
                            if val >= 1024 {
                                return val;
                            }
                        }
                    }
                }
            }
        }
    }
    3000
}

fn find_node_executable() -> String {
    let candidates = [
        "C:\\Program Files\\nodejs\\node.exe",
        "C:\\Program Files (x86)\\nodejs\\node.exe",
    ];
    for c in candidates {
        if PathBuf::from(c).exists() {
            return c.to_string();
        }
    }
    "node".to_string()
}

fn spawn_local_central_server_on_port(port: u16) {
    std::thread::spawn(move || {
        // If the server is already listening on this specific port, do not spawn duplicate
        if is_local_port_listening(port) {
            return;
        }

        if let Some((script_path, work_dir)) = find_server_cjs_path() {
            let node_bin = find_node_executable();
            let mut cmd = Command::new(&node_bin);
            cmd.arg(&script_path)
                .current_dir(&work_dir)
                .env("NODE_ENV", "production")
                .env("PORT", port.to_string())
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());

            #[cfg(target_os = "windows")]
            {
                cmd.creation_flags(CREATE_NO_WINDOW_AND_DETACHED);
            }

            let _ = cmd.spawn();
        }
    });
}

#[tauri::command]
fn install_windows_background_service(port: u16) -> Result<String, String> {
    let effective_port = if port < 1024 { 3000 } else { port };

    // Always persist configuredPort to data/server_node_config.json first
    write_port_to_config_files(effective_port, None);

    // Ensure the local central server process is running if not already listening
    spawn_local_central_server_on_port(effective_port);

    #[cfg(target_os = "windows")]
    {
        if let Some((script_path, work_dir)) = find_server_cjs_path() {
            let data_dir = work_dir.join("data");
            let _ = fs::create_dir_all(&data_dir);

            let bat_path = data_dir.join("anbarmeh_server_runner.bat");
            let vbs_path = data_dir.join("anbarmeh_background_daemon.vbs");
            let node_bin = find_node_executable();

            // Resilient background runner: keeps Node alive in background even when Tauri is closed
            let bat_content = format!(
                "@echo off\r\n\
                 chcp 65001 > nul\r\n\
                 set \"PATH=%PATH%;C:\\Program Files\\nodejs;C:\\Program Files (x86)\\nodejs;%APPDATA%\\npm;%LOCALAPPDATA%\\Programs\\nodejs\"\r\n\
                 cd /d \"{}\"\r\n\
                 set NODE_ENV=production\r\n\
                 set PORT={}\r\n\
                 :supervise_loop\r\n\
                 netstat -ano | findstr \":{} \" | findstr \"LISTENING\" > nul 2> nul\r\n\
                 if %errorlevel% neq 0 (\r\n\
                   \"{}\" \"{}\"\r\n\
                 )\r\n\
                 timeout /t 3 > nul\r\n\
                 goto supervise_loop\r\n",
                work_dir.display(),
                effective_port,
                effective_port,
                node_bin,
                script_path.display()
            );
            let _ = fs::write(&bat_path, bat_content);

            let vbs_content = format!(
                "Set WshShell = CreateObject(\"WScript.Shell\")\r\n\
                 WshShell.Run chr(34) & \"{}\" & chr(34), 0, False\r\n\
                 Set WshShell = Nothing\r\n",
                bat_path.display()
            );
            let _ = fs::write(&vbs_path, vbs_content);

            let vbs_cmd = format!("wscript.exe \"{}\"", vbs_path.display());
            let _ = Command::new("reg")
                .args([
                    "add",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "AnbarMehCentralSQLServer",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &vbs_cmd,
                    "/f",
                ])
                .creation_flags(CREATE_NO_WINDOW_FLAG)
                .output();

            // Immediately launch detached wscript daemon so it runs right now in background
            let _ = Command::new("wscript")
                .arg(&vbs_path)
                .creation_flags(CREATE_NO_WINDOW_AND_DETACHED)
                .spawn();

            let rule_name = format!("AnbarMeh-TCP-{}", effective_port);
            let port_arg = format!("localport={}", effective_port);
            let _ = Command::new("netsh")
                .args([
                    "advfirewall",
                    "firewall",
                    "add",
                    "rule",
                    &format!("name={}", rule_name),
                    "dir=in",
                    "action=allow",
                    "protocol=TCP",
                    &port_arg,
                    "profile=any",
                ])
                .creation_flags(CREATE_NO_WINDOW_FLAG)
                .output();

            return Ok(format!(
                "سرویس پس‌زمینه همیشه‌روشن ویندوز و دیتابیس SQL روی پورت {} ثبت و فعال شد.",
                effective_port
            ));
        } else {
            return Ok(format!(
                "سرویس پس‌زمینه ویندوز روی پورت {} ثبت گردید.",
                effective_port
            ));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(format!(
            "سرویس پس‌زمینه سرور مرکزی روی پورت {} فعال است.",
            effective_port
        ))
    }
}

#[tauri::command]
fn open_windows_firewall_elevated(port: u16) -> Result<String, String> {
    let effective_port = if port < 1024 { 3000 } else { port };
    #[cfg(target_os = "windows")]
    {
        let script = format!(
            "Remove-NetFirewallRule -DisplayName 'AnbarMeh-TCP-{p}' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'AnbarMeh-TCP-{p}' -Direction Inbound -Action Allow -Protocol TCP -LocalPort {p} -Profile Any -Enabled True; Remove-NetFirewallRule -DisplayName 'AnbarMeh-TCP-3000' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'AnbarMeh-TCP-3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -Enabled True; netsh advfirewall firewall delete rule name=AnbarMeh-TCP-{p} 2>$null; netsh advfirewall firewall add rule name=AnbarMeh-TCP-{p} dir=in action=allow protocol=TCP localport={p} profile=any 2>$null; netsh advfirewall firewall delete rule name=AnbarMeh-TCP-3000 2>$null; netsh advfirewall firewall add rule name=AnbarMeh-TCP-3000 dir=in action=allow protocol=TCP localport=3000 profile=any 2>$null; netsh advfirewall firewall add rule name=AnbarMeh-Node dir=in action=allow program=\"node.exe\" profile=any 2>$null; Get-NetConnectionProfile | Where-Object {{ $_.NetworkCategory -eq 'Public' }} | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue",
            p = effective_port
        );

        let utf16_units: Vec<u16> = script.encode_utf16().collect();
        let mut bytes = Vec::with_capacity(utf16_units.len() * 2);
        for unit in utf16_units {
            bytes.push((unit & 0xFF) as u8);
            bytes.push(((unit >> 8) & 0xFF) as u8);
        }

        const B64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut b64 = String::new();
        let mut i = 0;
        while i < bytes.len() {
            let b0 = bytes[i];
            let b1 = if i + 1 < bytes.len() { bytes[i + 1] } else { 0 };
            let b2 = if i + 2 < bytes.len() { bytes[i + 2] } else { 0 };
            b64.push(B64_CHARS[(b0 >> 2) as usize] as char);
            b64.push(B64_CHARS[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
            if i + 1 < bytes.len() {
                b64.push(B64_CHARS[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
            } else {
                b64.push('=');
            }
            if i + 2 < bytes.len() {
                b64.push(B64_CHARS[(b2 & 0x3F) as usize] as char);
            } else {
                b64.push('=');
            }
            i += 3;
        }

        let launcher_cmd = format!(
            "Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', '{}') -Verb RunAs",
            b64
        );

        let _ = Command::new("powershell.exe")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &launcher_cmd])
            .creation_flags(CREATE_NO_WINDOW_FLAG)
            .spawn();

        Ok(format!(
            "دستور بازگشایی پورت {} و 3000 در فایروال ویندوز صادر شد. پنجره تایید UAC را تایید (Yes) نمایید.",
            effective_port
        ))
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(format!("پورت {} در سیستم‌عامل غیر ویندوز آماده است.", effective_port))
    }
}

#[tauri::command]
fn test_port_listening(port: u16, lan_ip: Option<String>) -> Result<serde_json::Value, String> {
    let effective_port = if port < 1024 { 3000 } else { port };
    let local_ok = is_local_port_listening(effective_port);
    let lan_ok = if let Some(ref ip) = lan_ip {
        let addr_str = format!("{}:{}", ip, effective_port);
        if let Ok(addr) = addr_str.parse::<SocketAddr>() {
            TcpStream::connect_timeout(&addr, Duration::from_millis(900)).is_ok()
        } else {
            false
        }
    } else {
        false
    };

    Ok(serde_json::json!({
        "localOk": local_ok,
        "lanOk": lan_ok,
        "port": effective_port,
        "lanIp": lan_ip
    }))
}

#[tauri::command]
fn save_and_apply_server_port(port: u16, lan_ip: Option<String>) -> Result<serde_json::Value, String> {
    let effective_port = if port < 1024 { 3000 } else { port };

    // 1. Write or update data/server_node_config.json on disk
    write_port_to_config_files(effective_port, lan_ip.as_deref());

    // 2. Install background runner scripts and autostart registry entry
    let _ = install_windows_background_service(effective_port);

    // 3. Trigger elevated firewall rule (non-blocking)
    let _ = open_windows_firewall_elevated(effective_port);

    // 4. Ensure Node is running on effective_port
    if !is_local_port_listening(effective_port) {
        spawn_local_central_server_on_port(effective_port);
    }

    // 5. Poll up to 3 seconds (12 * 250ms) until port binds
    let mut local_ok = false;
    for _ in 0..12 {
        if is_local_port_listening(effective_port) {
            local_ok = true;
            break;
        }
        std::thread::sleep(Duration::from_millis(250));
    }

    // 6. Test LAN IP port via TCP socket
    let lan_ok = if let Some(ref ip) = lan_ip {
        let addr_str = format!("{}:{}", ip, effective_port);
        if let Ok(addr) = addr_str.parse::<SocketAddr>() {
            TcpStream::connect_timeout(&addr, Duration::from_millis(900)).is_ok()
        } else {
            false
        }
    } else {
        false
    };

    Ok(serde_json::json!({
        "success": true,
        "port": effective_port,
        "localOk": local_ok,
        "lanOk": lan_ok,
        "lanIp": lan_ip
    }))
}

fn main() {
    let startup_port = find_configured_port();
    spawn_local_central_server_on_port(startup_port);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_windows_hardware_id,
            get_windows_hostname,
            get_local_lan_ip,
            get_all_lan_ips,
            install_windows_background_service,
            open_windows_firewall_elevated,
            test_port_listening,
            save_and_apply_server_port
        ])
        .run(tauri::generate_context!())
        .expect("error while running AnbarMeh tauri application");
}
