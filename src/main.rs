mod builder;
pub use crate::builder::Builder;

use clap::{Arg, App};

fn main() {
    let matches = App::new("What's cookin'")
        .version("1.0")
        .author("Todd Kennedy <todd@selfassembled.org>")
        .about("Static site blog generator")
        .arg(Arg::with_name("src")
            .index(1)
            .required(true)
            .value_name("SRC_DIR")
            .help("Sets the path where your markdown files live")
            .takes_value(true))
        .arg(Arg::with_name("dest")
            .index(2)
            .required(true)
            .value_name("DEST_DIR")
            .help("Sets the destination path for html files")
            .takes_value(true))
        .arg(Arg::with_name("entries")
            .short("e")
            .long("entries")
            .value_name("NUM_ENTRIES")
            .help("How many entries on the home page")
            .takes_value(true)
            .default_value("20"))
        .get_matches();

    let src_dir = matches.value_of("src").unwrap();
    let dest_dir = matches.value_of("dest").unwrap();
    let entries: i32 = matches.value_of("entries").unwrap().parse().unwrap();
    let b = Builder::new(src_dir, dest_dir);

    println!("{:?}", b);
}
