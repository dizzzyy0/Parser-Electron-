import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import axios from 'axios'
import iconv from 'iconv-lite'
import chardet from 'chardet'
import * as cheerio from 'cheerio'

let mainWindow

async function fetchLossesData(selectedDate = '', language = '') {
  try {
    let url = '';
    if(language === 'en'){
      url = selectedDate ? `https://russianwarship.rip/en/${selectedDate}` : 'https://russianwarship.rip/en';
    }else{
      url = selectedDate ? `https://russianwarship.rip/${selectedDate}` : 'https://russianwarship.rip/';
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const encoding = chardet.detect(response.data) || 'utf-8';
    const html = iconv.decode(Buffer.from(response.data), encoding);
    const $ = cheerio.load(html);

    const dayOfWar = $('[data-date="day"]').text().trim();
    const facebookLink = $('.page-datepicker-link a').attr('href') || '';

    let lossesData = {
      title: $('h1').text().trim(),
      dayOfWar: dayOfWar,
      facebookLink: facebookLink,
      losses: [],
      icons: {}
    };

    const uniqueCategories = new Set();

    $('.loses-item').each((_, item) => {
      const category = $(item).find('.loses-item-text').text().trim();
      const total = $(item).find('.loses-item-value').text().trim();
      const change = $(item).find('[data-increase]').text().trim();
      
      const iconUse = $(item).find('use');
      let iconId = iconUse.length > 0 ? iconUse.attr('xlink:href') || iconUse.attr('href') : '';
      if (iconId) {
        iconId = iconId.replace('#', '');
        if (iconId === 'icon-submarines') {
          iconId = 'icon-submarine';
        }
        uniqueCategories.add(iconId);
      }

      if(category){
        lossesData.losses.push({ category, total, change, iconId });
      }
    });

    for (const iconId of uniqueCategories) {
      try {
        const iconUrl = `https://russianwarship.rip/images/icons/${iconId}.svg`;
        const iconResponse = await axios.get(iconUrl, { responseType: 'text' });

        if (iconResponse.status === 200) {
          lossesData.icons[iconId] = iconResponse.data;
        }
      } catch (error) {
        const fallbackIcons = {
          'icon-personnel_units': '<circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="20"/><line x1="8" y1="16" x2="16" y2="16"/>'
        };

        if (fallbackIcons[iconId]) {
          lossesData.icons[iconId] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${fallbackIcons[iconId]}</svg>`;
        }
      }
    }

    return lossesData;
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return { error: `Data retrieval error: ${error.message}` };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('get-data', async (_, date, language) => {
    return await fetchLossesData(date, language);
  });

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})