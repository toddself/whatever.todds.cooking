use std::{error::Error, fmt, result::Result};
use std::path::{Path, PathBuf};
use std::fs;
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
    entries: Vec<FileEntry>,
    num_per_page: i32,
    template_dir: &'a Path,
    hbs: Handlebars<'a>,
}

const HEADER_DELIMITER:&str = "---";
const DATE_FORMAT:&str = "%A, %b %e, %Y";

impl<'a> Builder<'a> {
    pub fn new(s: &'a str, d: &'a str, t: &'a str, c: i32) -> Result<Builder<'a>, Box<dyn Error>> {
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

        match fs::DirBuilder::new()
            .recursive(true)
            .create(dest_dir) {
                Ok(d) => d,
                Err(e) => return Err(e.into())
        }

        let files = match get_entries(s) {
            Ok(f) => f,
            Err(_e) => vec![],
        };

        let mut hbs = Handlebars::new();
        let templates:Vec<PathBuf> = match get_entries(t) {
            Ok(t) => t,
            Err(_e) => vec![],
        };

        for tpl_path in templates.iter() {
            let filename = tpl_path.to_str() 
                .expect(format!("Invalid unicode in filename: {:?}", tpl_path).as_str());

            let name = match tpl_path.iter().last() {
                Some(u) => match u.to_str() {
                    Some(u) => u.split('.').next().unwrap(),
                    None => filename,
                },
                None => filename,
            };
            hbs.register_template_file(name, tpl_path)?;
        }


        Ok(Builder{
            src_dir,
            dest_dir,
            template_dir,
            files,
            entries: vec![],
            num_per_page: c,
            hbs,
        })
    }

    pub fn build(&mut self) -> Result<(), Box<(dyn Error + 'static)>> {
        for file in self.files.iter() {
            let entry = self.parse_entry(file).unwrap();
            self.entries.push(entry);
        }
        Ok(self.build_blog()?)
    }

    fn build_blog(&self) -> Result<(), Box<(dyn Error + 'static)>> {
        let mut count = 0;
        for entry_set in self.entries.chunks(self.num_per_page as usize) {
            let mut entries:Vec<String> = vec![];
            for entry in entry_set {
                let post_data = json!({
                    "title": entry.title,
                    "contents": entry.contents,
                    "tags": entry.tags,
                    "modified": entry.modified.format(DATE_FORMAT).to_string(),
                });
                let rendered = self.hbs.render("entry", &post_data)?;

                let page_data = json!({
                    "title": "whatever todd's cooking",
                    "contents": vec![rendered.as_str()],
                    "pagination": false
                });
                let full_post = self.hbs.render("index", &page_data)?;
                let output_fn = self.dest_dir.join(entry.url.as_str());
                println!("Writing {} to {:?}", entry.title, output_fn);
                fs::write(output_fn, full_post)?;
                entries.push(rendered);
            }
            let index_fn = match count {
                0 => String::from("index.html"),
                _ => format!("index{}.html", count),
            };
            let page_data = json!({
                "title": "whatever todd's cooking",
                "contents": entries,
                "pagingation": false
            });
            let output_fn = self.dest_dir.join(index_fn.as_str());
            let index_page = self.hbs.render("index", &page_data)?;
            fs::write(output_fn, index_page)?;
            count += 1;
        }
        Ok(())
    }

    fn parse_entry(&self, file: &PathBuf) -> Result<FileEntry, std::io::Error> {
        let filename = file.to_str().unwrap();
        let buf = fs::read_to_string(filename).unwrap();

        let mut pub_date = DateTime::<FixedOffset>::from(Local::now());
        let mut tag_list:Vec<String> = vec![];
        let mut title = String::new();

        let mut sep_count = 0;
        for line in buf.lines() {
            if line == HEADER_DELIMITER {
                sep_count += 1;
                if sep_count == 2 {
                    break;
                }
            }

            let elements:Vec<&str> = line.split(' ').collect();
            let data_type = elements.get(0);
            let data_value = elements[1..].join(" ");

            match data_type {
                Some(&"date:") => {
                    pub_date = parse_date(data_value.as_str());
                },
                Some(&"tags:") => {
                    tag_list = parse_tags(data_value.as_str());
                },
                Some(&"title:") => {
                    title = String::from(data_value);
                }
                _ => ()
            }
        }

        let url = match file.iter().last() {
            Some(u) => match u.to_str() {
                Some(u) => String::from(u).replace(".md", ".html"),
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

        println!("Parsed {:?} as {}", file, title);

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

