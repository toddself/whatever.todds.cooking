use std::{error::Error, fmt};
use std::path::{Path, PathBuf};
use std::fs::{DirBuilder, read_dir, read_to_string};
use std::io;
use std::str;

use comrak::{markdown_to_html, ComrakOptions};
use chrono::{DateTime, FixedOffset, Local};
use voca_rs::strip::strip_tags;

#[derive(Debug)]
pub struct BuilderDirError {
    details: String
}

impl BuilderDirError {
    fn new (msg: &str) -> BuilderDirError {
        BuilderDirError{details: msg.to_string()}
    }
}

impl fmt::Display for BuilderDirError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.details)
    }
}

impl Error for BuilderDirError {
    fn description(&self) -> &str {
        &self.details
    }
}

#[derive(Debug)]
pub struct FileEntry {
    pub modified: DateTime<FixedOffset>, 
    pub filename: String,
    pub raw_text: String,
    pub contents: String,
    pub tags: Vec<String>,
    pub title: String,
    pub url: String,
}

#[derive(Debug)]
pub struct Builder <'a> {
    pub src_dir: &'a Path,
    pub dest_dir: &'a  Path,
    pub files: Vec<PathBuf>,
    pub entries: Option<Vec<FileEntry>>,
}

impl<'a> Builder<'a> {
    pub fn new(s: &'a str, d: &'a str) -> Result<Builder<'a>, Box<dyn Error>> {
        let src_dir = Path::new(s);
        let dest_dir = Path::new(d);

        if src_dir.is_dir() == false {
            let e = BuilderDirError::new("src dir is not a dir");
            return Err(e.into());
        }

        match DirBuilder::new()
            .recursive(true)
            .create(dest_dir) {
                Ok(a) => a,
                Err(e) => return Err(e.into())
        }

        let files= match get_entries(s) {
            Ok(e) => e,
            Err(_e) => vec![],
        };

        Ok(Builder{
            src_dir,
            dest_dir,
            files,
            entries: None
        })
    }

    pub fn initialize(&self) {
        let mut entries:Vec<FileEntry> = vec![];
        for file in self.files.iter() {
            let entry = self.parse_entry(file).unwrap();
            println!("{:?}", entry);
            entries.push(entry);
        }
    }
    
    fn parse_entry(&self, file: &PathBuf) -> Result<FileEntry, std::io::Error> {
        let filename = file.to_str().unwrap();
        let buf = read_to_string(filename).unwrap();

        let mut lines:Vec<&str> = buf.split("\n").collect();
        let date = lines[0];
        let tags = lines[1];

        let pub_date = match date.chars().next().unwrap() {
           '$' => {
                lines.remove(0);
                let date = &date[1..];
                println!("{} {}", filename, date);
                match DateTime::parse_from_rfc3339(&date) {
                    Ok(d) => d,
                    Err(_e) => DateTime::<FixedOffset>::from(Local::now()),
                }
           },
            _ => DateTime::<FixedOffset>::from(Local::now())
        };

        // todo figure out tag list without borrowing
        let tag_list = match tags.chars().next().unwrap() {
            '%' => {
                lines.remove(0);
                let tags:Vec<String> = tags[1..].split(',').map(|e| String::from(e)).collect();
                tags
            },
            _ => vec![],
        };

        let url = match file.iter().last() {
            Some(u) => match u.to_str() {
                Some(u) => String::from(u),
                None => String::from(filename),
            },
            None => String::from(filename),
        };

        let mut entry_data = lines.join("\n");

        let mut title = String::new();
        let mut start = 0;
        for &line in lines.iter() {
            if line.starts_with("##") {
                let t = line[2..].trim();
                title.push_str(t);
                let header = format!("## [{}]({})", t, url.as_str());
                let end = start + line.len();
                entry_data.replace_range(start..end, header.as_str());
                break;
            }
            start = start + line.len();
        };
        
        let mut comrak_options = ComrakOptions::default();
        comrak_options.render.unsafe_ = true;
        comrak_options.parse.smart = true;
        let contents = markdown_to_html(entry_data.as_str(), &comrak_options);
        let raw_text = strip_tags(contents.as_str());

        let entry = FileEntry{
            modified: pub_date,
            filename: String::from(filename),
            tags: tag_list,
            raw_text,
            contents,
            title,
            url,
        };

        Ok(entry)
    }
}

fn get_entries(src: &str) -> io::Result<Vec<PathBuf>> {
    let entries = read_dir(src)?
        .map(|res| res.map(|e| e.path()))
        .collect::<Result<Vec<_>, io::Error>>()?;
    Ok(entries)
}
