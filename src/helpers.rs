use std::io;
use std::path::PathBuf;
use std::fs::read_dir;
use chrono::{DateTime, FixedOffset, Local};

pub fn parse_date(date: &str) -> DateTime::<FixedOffset> {
    match DateTime::parse_from_rfc3339(&date) {
        Ok(d) => {
            d
        },
        Err(_e) => {
            println!("Unable to parse {} as a date", date);
            DateTime::<FixedOffset>::from(Local::now())
        },
    }
}

pub fn parse_tags(tags: &str) -> Vec<String> {
    tags.split(',')
        .map(|e| String::from(e.trim()))
        .collect()
}


pub fn get_entries(src: &str) -> io::Result<Vec<PathBuf>> {
    let entries = read_dir(src)?
        .map(|res| res.map(|e| e.path()))
        .collect::<Result<Vec<_>, io::Error>>()?;
    Ok(entries)
}

pub fn truncate_text(text: &str, truncate_len: usize) -> &str {
    if text.len() < truncate_len { 
        return text;
    }

     match text.chars().nth(truncate_len) {
        Some(c) => match c {
            ' ' => text.split_at(truncate_len).0,
            _ => {
                let truncated = text.split_at(truncate_len);
                let prev_ws = match truncated.0.rfind(char::is_whitespace) {
                    Some(i) => i,
                    None => 0,
                };
                let next_ws = match truncated.1.find(char::is_whitespace) {
                    Some(i) => i,
                    None => text.len(),
                };
                match next_ws > prev_ws {
                    true => text.split_at(prev_ws).0,
                    false => text.split_at(next_ws).0,
                }
            },
        }, 
        None => text.split_at(truncate_len).0,
    }
}
