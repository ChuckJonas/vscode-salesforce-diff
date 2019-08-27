# Salesforce Diff

This extension allows you to diff metadata against a Salesforce org.

*NOTE: Still in very early stages! Please be patient and help by submitting issues (or better yet, PR's!)*

## Features

- Uses the default SFDX connect for the project
- Supports all metadata[^*]
- Ability to select an org to diff with

[^*]: Still somewhat untested.  To diff non-apex, you must run command `SF Diff: Diff with Default Org` from command pallet.

![demo](https://user-images.githubusercontent.com/5217568/63788182-00da5f80-c8c3-11e9-9522-cec41c99c5d9.gif)

## Requirements

- You must have [SFDX CLI installed](https://developer.salesforce.com/tools/sfdxcli)
- For non-apex metadata types, you must be working out of a salesforce-dx project.

## Usage

Whenever a `cls` or `*-meta.xml` file is open, you'll see an the "SF Diff" icon in the upper left. 

<img width="1157" alt="readme1" src="https://user-images.githubusercontent.com/5217568/63790059-8f9cab80-c8c6-11e9-9be4-8eb700b274c5.png">


Clicking this will diff the file against the projects default org.  If you `alt/option` + click, you can select the org to diff against.

You can also run either command directly from the pallet:

- `SF DIFF: Current Org`
- `SF DIFF: Select an Org`

## Known Issues

- Likely issues around multiple namespaces
- non-apex metadata types is experimental.  Might not work outside "default" sfdx `packageDirectory`. Hasn't been tested for all MD types.


