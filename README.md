# Salesforce Diff

This extension allows you to diff metadata against a Salesforce org.

*NOTE: Still in very early stages! Please be patient and help by submitting issues (or better yet, PR's!)*

## Features

- Uses the default SFDX connect for the project
- Now Supports ALL metadata types![^*]


[^*]: Still somewhat untested.  To diff non-apex, you must run command `SF Diff: Diff with Default Org` from command pallet.

![Diff in action](images/demo.gif)

## Requirements

- You must have SFDX CLI installed
- For non-apex metadata types, you must be working off a salesforce-dx project.

## Known Issues

- Likely issues around multiple namespaces
- non-apex metadata types is experimental.  Might not work outside default sfdx `packageDirectory`. 

