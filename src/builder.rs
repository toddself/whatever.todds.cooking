use std::{error::Error, fmt};
use std::path::{Path, PathBuf};
use std::fs::{DirBuilder, read_to_string};
use std::str;

use comrak::{markdown_to_html, ComrakOptions};
use chrono::{DateTime, FixedOffset, Local};
use voca_rs::strip::strip_tags;
use handlebars::Handlebars;
use serde_json::json;

use crate::helpers::{parse_date, parse_tags, get_entries};

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
    src_dir: &'a Path,
    dest_dir: &'a  Path,
    files: Vec<PathBuf>,
    entries: Option<Vec<FileEntry>>,
    num_per_page: u32,
    template_dir: &'a Path,
}

const HEADER_DELIMITER: &str = "---";

impl<'a> Builder<'a> {
    pub fn new(s: &'a str, d: &'a str, t: &'a str, c: u32) -> Result<Builder<'a>, Box<dyn Error>> {
        let src_dir = Path::new(s);
        let dest_dir = Path::new(d);
        let template_dir = Path::new(t);

        if src_dir.is_dir() == false {
            let msg = format!("src dir ({}) is not a dir", s);
            let e = BuilderDirError::new(msg.as_str());
            return Err(e.into());
        }

        if template_dir.is_dir() == false {
            let msg = format!("template dir ({}) is not a dir", t);
            let e = BuilderDirError::new(msg.as_str());
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
            template_dir,
            files,
            entries: None,
            num_per_page: c,
        })
    }

    pub fn build(&self) {
        let mut entries:Vec<FileEntry> = vec![];
        for file in self.files.iter() {
            let entry = self.parse_entry(file).unwrap();
            println!("{:?}", entry);
            entries.push(entry);
        }
    }

    fn build_index(&self) {
    }

    fn parse_entry(&self, file: &PathBuf) -> Result<FileEntry, std::io::Error> {
        let filename = file.to_str().unwrap();
        let buf = read_to_string(filename).unwrap();

        let mut pub_date = DateTime::<FixedOffset>::from(Local::now());
        let mut tag_list:Vec<String> = vec![];
        let mut title = String::new();

        let mut sep_count = 0;
        for line in buf.lines() {
            if line == HEADER_DELIMITER {
                sep_count += 1;
            }

            if sep_count == 2 {
                break;
            }

            let elements:Vec<&str> = line.split(' ').collect();
            let data_type = elements.get(0);
            let data_value = match elements.get(1) {
                Some(&v) => v,
                None => "",
            };

            match data_type {
                Some(&"date:") => {
                    pub_date = parse_date(data_value);
                },
                Some(&"tags:") => {
                    tag_list = parse_tags(data_value);
                },
                Some(&"title:") => {
                    title = String::from(data_value);
                }
                _ => ()
            }
        }

        let url = match file.iter().last() {
            Some(u) => match u.to_str() {
                Some(u) => String::from(u),
                None => String::from(filename),
            },
            None => String::from(filename),
        };

        let mut comrak_options = ComrakOptions::default();
        comrak_options.render.unsafe_ = true;
        comrak_options.parse.smart = true;
        comrak_options.extension.front_matter_delimiter = Some(HEADER_DELIMITER.to_owned());
        let contents = markdown_to_html(buf.as_str(), &comrak_options);
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

