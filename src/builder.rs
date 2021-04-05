use std::{error::Error, fmt};
use std::path::Path;
use std::fs::DirBuilder; //, read_dir, read_to_string, write};

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
pub struct Builder <'a> {
    pub src_dir: &'a Path,
    pub dest_dir: &'a  Path,
    pub entries: i32,
}

impl<'a> Builder<'a> {
    pub fn new(s: &'a str, d: &'a str, entries: i32) -> Result<Builder<'a>, Box<dyn Error>> {
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

        Ok(Builder{
            src_dir,
            dest_dir,
            entries
        })
    }

    pub fn get_entries(&self) {
    }
}
