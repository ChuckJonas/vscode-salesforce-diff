# Salesforce Diff

This extension allows you to diff metadata against a Salesforce org.

*NOTE: This extension is in an alpha/proof of concept stage.  Please be patient and help by submitting issues (or better yet, PR's!)*

## Features

- Uses the default SFDX connect for the project
- Currently only support Apex.  Other metadata types will be added in future.

![Diff in action](images/demo.gif)

## Requirements

- You must have SFDX CLI installed
- A default org must be set (this works best with sdfx projects, but can work with any project)

## Known Issues

- Likely issues around multiple namespaces

## Release Notes

### 0.0.2

- fixed bug where it would always use global sfdx default user (instead of project)

### 0.0.1

Initial release.  Very limited functionality