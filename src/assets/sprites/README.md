# Pokemon Sprites

This directory contains custom Pokemon sprites that are served statically by the API.

## Usage

Place a `null.png` image in this directory. This image will be displayed when:

- A custom sprite cannot be found
- Auto-generation of a sprite fails
- No sprite is available for a specific Pokemon fusion

The required file is:

- `null.png` (fallback image for missing sprites)

## Access

The null sprite is served at: `/api/images/fusion/null`

Example: `http://pokefusionapi.com/api/images/fusion/null`
