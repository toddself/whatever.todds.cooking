use std::{error::Error, fmt};
use std::path::{Path, PathBuf};
use std::fs::{DirBuilder, read_dir, read}; //, read_to_string, write};
use std::io;
use std::str;

use chrono::{DateTime, FixedOffset, Local};

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
pub struct FileEntry <'b> {
    pub modified: DateTime<FixedOffset>, 
    pub filename: &'b str,
    pub raw_text: &'b str,
    pub contents: &'b str,
    pub tags: &'b Vec<&'b str>,
    pub title: &'b str,
    pub url: &'b str,
}

#[derive(Debug)]
pub struct Builder <'a> {
    pub src_dir: &'a Path,
    pub dest_dir: &'a  Path,
    pub files: Vec<PathBuf>,
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
            Err(e) => vec![],
        };

        Ok(Builder{
            src_dir,
            dest_dir,
            files,
        })
    }

    pub fn parse_entry(filename: &'a str) -> Result<&'a FileEntry<'a>, std::io::Error> {
        let buf:&str = str::from_utf8(&read(filename)?).unwrap();

        let mut lines:Vec<&str> = buf.split("\n").collect();
        let date = lines[0];
        let tags = lines[1];
        let pub_date = match date.chars().next().unwrap() {
           '$' => {
                lines.remove(0);
                DateTime::parse_from_rfc2822(&date[1..]).unwrap()
           },
            _ => DateTime::<FixedOffset>::from(Local::now())
        };

        let tag_list = match tags.chars().next().unwrap() {
            '%' => {
                lines.remove(0);
                &tags[1..].split(',').collect()
            },
            _ => &vec![],
        };

        let entry = &FileEntry{
            modified: pub_date,
            filename,
            tags: tag_list,
            raw_text: buf,
            contents: buf,
            title: "",
            url: "",
        };

        Ok(entry)
    }
}

fn get_entries(src: &str) -> io::Result<Vec<PathBuf>> {
    let mut entries = read_dir(src)?
        .map(|res| res.map(|e| e.path()))
        .collect::<Result<Vec<_>, io::Error>>()?;
    Ok(entries)
}
