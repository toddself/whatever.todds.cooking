use std::io;
use std::path::PathBuf;
use std::fs::read_dir;
use chrono::{DateTime, FixedOffset, Local};

pub fn parse_date(date: &str) -> DateTime::<FixedOffset> {
    match date.chars().next() {
       Some('$') => {
            let date = &date[1..];
            match DateTime::parse_from_rfc3339(&date) {
                Ok(d) => d,
                Err(_e) => {
                    println!("Unable to parse {} as a date", date);
                    DateTime::<FixedOffset>::from(Local::now())
                },
            }
       },
        _ => DateTime::<FixedOffset>::from(Local::now())
    }
}

pub fn parse_tags(tags: &str) -> Vec<String> {
    match tags.chars().next().unwrap() {
        '%' => {
            let tags:Vec<String> = tags[1..].split(',').map(|e| String::from(e)).collect();
            tags
        },
        _ => vec![],
    }
}


pub fn get_entries(src: &str) -> io::Result<Vec<PathBuf>> {
    let entries = read_dir(src)?
        .map(|res| res.map(|e| e.path()))
        .collect::<Result<Vec<_>, io::Error>>()?;
    Ok(entries)
}

pub fn truncate_text(text: &str) -> &str {
    return "";

// const truncateLength = 200
// const ws = /\s/
// function truncate (s: string){
//   if (s.length < truncateLength) return s
//   const source = [...s]
//   const trunc = source.slice(0, truncateLength)
//   const last = trunc[truncateLength - 1]
//   if (!last.match(ws)) {
//     const p = Array.from(trunc).reverse().findIndex(c => c.match(ws))
//     const prev = truncateLength - p
//     const prevDist = truncateLength - prev
//     const n = source.slice(truncateLength).findIndex(c => c.match(ws))
//     const next = truncateLength + n
//     const nextDist = next - truncateLength
//     if (prevDist > nextDist) {
//       return s.substring(0, next) + '...'
//     } else {
//       return s.substring(0, prev) + '...'
//     }
//   }
//   return trunc.join('') + '...'
// }
}
