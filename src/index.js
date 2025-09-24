const puppeteer = require('puppeteer');

const SITE_URL = 'https://www.japeal.com/pkm';

async function sleep(seconds) {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
}

async function getRandomFusion(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      // Launch using specific browser path if set
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: [
        '--disable-dev-shm-usage', // Used to prevent Chromium from crashing inside Docker
        '--window-size=1040,780', // Need a larger window to render the whole Pokédex entry
      ],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser through Puppeteer');

    console.log('[PokéFusion API] Navigating to ' + SITE_URL);
    await page.goto(SITE_URL);

    // Page fully loaded, you can execute scripts now

    // First, let that putrid PHP Wordpress third world piece of bullcrap load all of its shit
    await sleep(1);

    // Close the Patreon dialog and make the fusion happen
    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);

    // Wait another 5 seconds for the fusion
    await sleep(5);
    console.log('[PokéFusion API] Getting fusion info!');

    // Grab all fusion info including sprites, names, types, cries, and share URL
    const result = await page.evaluate(`
    function grabFusionInfo() {
      var fusionIndexes = document.getElementById('fbutton').onclick.toString()
        .replace('function onclick(event) {', '')
        .replace('}', '').replace('LoadNewFusionDelay(', '')
        .replace(')', '').trim().split(',');
      return JSON.stringify({
        leftPkmnIndex: parseInt(fusionIndexes[0]),
        rightPkmnIndex: parseInt(fusionIndexes[1]),
        fusionBase64: document.getElementById('combinedNEW').toDataURL(),
        fusionName: document.getElementById('fnametxt').innerHTML.trim(),
        leftPokemonName: document.getElementById('Ltxt').innerHTML.trim(),
        rightPokemonName: document.getElementById('Rtxt').innerHTML.trim(),
        leftPokemonSprite: document.getElementById('Limagediv').style.backgroundImage.replace('url("', '').replace('")', ''),
        rightPokemonSprite: document.getElementById('Rimagediv').style.backgroundImage.replace('url("', '').replace('")', ''),
        types: {
          leftPokemon: {
            firstType: document.getElementById('L1Type').src,
            secondType: document.getElementById('L2Type').src
          },
          rightPokemon: {
            firstType: document.getElementById('R1Type').src,
            secondType: document.getElementById('R2Type').src
          },
          fusion: {
            firstType: document.getElementById('FusedTypeL').src,
            secondType: document.getElementById('FusedTypeR').src
          }
        },
        cries: {
          leftPokemonCry: document.querySelector('#audio1 #wav').src,
          rightPokemonCry: document.querySelector('#audio2 #wav').src
        },
        shareUrl: document.getElementById('permalink').value
      })
    }
    grabFusionInfo()
    `);
    let fusionInfo = JSON.parse(result);

    console.log('[PokéFusion API] Taking Pokédex screenshot!');

    // Grab Pokédex entry image from page
    await page.evaluate(`changeBG9()`); // Open Pokédex
    const pokedexBase64 = await page.screenshot({
      clip: {
        x: 222,
        y: 545,
        width: 596,
        height: 410,
      },
      encoding: 'base64',
    });

    console.log('[PokéFusion API] Your fusion is ready!');
    return {
      ...fusionInfo,
      pokedexBase64: pokedexBase64,
    };
  } catch (err) {
    console.error('[PokéFusion API] Fatal Error!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to get Pokémon sprite URLs
async function getPokemonSprites(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: ['--disable-dev-shm-usage', '--window-size=1040,780'],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser for sprite URLs');

    await page.goto(SITE_URL);
    await sleep(1);

    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);
    await sleep(5);

    const sprites = await page.evaluate(`
      JSON.stringify({
        leftPokemonSprite: document.getElementById('Limagediv').style.backgroundImage.replace('url("', '').replace('")', ''),
        rightPokemonSprite: document.getElementById('Rimagediv').style.backgroundImage.replace('url("', '').replace('")', '')
      })
    `);

    return JSON.parse(sprites);
  } catch (err) {
    console.error('[PokéFusion API] Error getting sprites!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to get Pokémon names
async function getPokemonNames(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: ['--disable-dev-shm-usage', '--window-size=1040,780'],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser for Pokémon names');

    await page.goto(SITE_URL);
    await sleep(1);

    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);
    await sleep(5);

    const names = await page.evaluate(`
      JSON.stringify({
        fusionName: document.getElementById('fnametxt').innerHTML.trim(),
        leftPokemonName: document.getElementById('Ltxt').innerHTML.trim(),
        rightPokemonName: document.getElementById('Rtxt').innerHTML.trim()
      })
    `);

    return JSON.parse(names);
  } catch (err) {
    console.error('[PokéFusion API] Error getting names!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to get type image URLs
async function getPokemonTypes(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: ['--disable-dev-shm-usage', '--window-size=1040,780'],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser for type images');

    await page.goto(SITE_URL);
    await sleep(1);

    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);
    await sleep(5);

    const types = await page.evaluate(`
      JSON.stringify({
        leftPokemon: {
          firstType: document.getElementById('L1Type').src,
          secondType: document.getElementById('L2Type').src
        },
        rightPokemon: {
          firstType: document.getElementById('R1Type').src,
          secondType: document.getElementById('R2Type').src
        },
        fusion: {
          firstType: document.getElementById('FusedTypeL').src,
          secondType: document.getElementById('FusedTypeR').src
        }
      })
    `);

    return JSON.parse(types);
  } catch (err) {
    console.error('[PokéFusion API] Error getting types!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to get cry audio URLs
async function getPokemonCries(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: ['--disable-dev-shm-usage', '--window-size=1040,780'],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser for cry URLs');

    await page.goto(SITE_URL);
    await sleep(1);

    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);
    await sleep(5);

    const cries = await page.evaluate(`
      JSON.stringify({
        leftPokemonCry: document.querySelector('#audio1 #wav').src,
        rightPokemonCry: document.querySelector('#audio2 #wav').src
      })
    `);

    return JSON.parse(cries);
  } catch (err) {
    console.error('[PokéFusion API] Error getting cries!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to get share URL
async function getShareUrl(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: ['--disable-dev-shm-usage', '--window-size=1040,780'],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser for share URL');

    await page.goto(SITE_URL);
    await sleep(1);

    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);
    await sleep(5);

    const shareUrl = await page.evaluate(`
      document.getElementById('permalink').value
    `);

    return shareUrl;
  } catch (err) {
    console.error('[PokéFusion API] Error getting share URL!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to get fusion image base64
async function getFusionImage(browserPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      args: ['--disable-dev-shm-usage', '--window-size=1040,780'],
    });
    const page = await browser.newPage();
    console.log('[PokéFusion API] Launched browser for fusion image');

    await page.goto(SITE_URL);
    await sleep(1);

    await page.evaluate(`
      ShowUnlock();
      document.getElementById("fbutton").onclick();
    `);
    await sleep(5);

    const fusionBase64 = await page.evaluate(`
      document.getElementById('combinedNEW').toDataURL()
    `);

    return fusionBase64;
  } catch (err) {
    console.error('[PokéFusion API] Error getting fusion image!', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

exports.getRandomFusion = getRandomFusion;
exports.getPokemonSprites = getPokemonSprites;
exports.getPokemonNames = getPokemonNames;
exports.getPokemonTypes = getPokemonTypes;
exports.getPokemonCries = getPokemonCries;
exports.getShareUrl = getShareUrl;
exports.getFusionImage = getFusionImage;
