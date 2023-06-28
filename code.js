figma.showUI(__html__);
// const defaultProps = ['textLayerStyle', 'fontFamily', 'fontStyle', 'fontSize'];
async function CreateAvailableFontsList() {
  const availableFonts = await figma.listAvailableFontsAsync();
  const fontsMap = new Map();
  for (let i = 0; i < availableFonts.length; i += 1) {
    const it = availableFonts[i];
    if (fontsMap.has(it.fontName.family)) fontsMap.get(it.fontName.family).push(it.fontName.style);
    else fontsMap.set(it.fontName.family, [it.fontName.style]);
  }
  figma.ui.postMessage({ payload: [...fontsMap.entries()], type: 'available-fonts-list' });
}
function GetAllTexts(selection = figma.currentPage.selection) {
  const allTexts = [];
  if (selection.length > 0) {
    for (let i = 0; i < selection.length; i += 1) {
      if (selection[i].type !== 'TEXT' && !('children' in selection[i])) { /* empty */ } else if (selection[i].type === 'TEXT') {
        allTexts.push(selection[i]);
      } else {
        allTexts.push(...selection[i].findAllWithCriteria({ types: ['TEXT'] }));
      }
    }
  }
  return allTexts;
}

function GetGroupedTextLayers(allTexts = GetAllTexts()) {
  const layersMap = new Map();
  for (let i = 0; i < allTexts.length; i += 1) {
    const it = allTexts[i];
    let textStyle;
    if (figma.getStyleById(it.textStyleId) !== null) {
      textStyle = figma.getStyleById(it.textStyleId).name;
    } else {
      textStyle = '–';
    }
    const key = `${it.fontName.family}#${it.fontName.style}#${it.fontSize}#${textStyle}`;
    if (layersMap.has(key)) layersMap.get(key).push(it.id);
    else layersMap.set(key, [it.id]);
  }
  figma.ui.postMessage({ payload: [...layersMap.entries()], type: 'grouped-text-layers' });
}

async function SetFont(id, family, style, fontSize) {
  await figma.loadFontAsync({ family, style });
  const allTexts = GetAllTexts();
  for (let i = 0; i < allTexts.length; i += 1) {
    const it = allTexts[i];
    if (it.id === id) {
      it.fontName = {
        family,
        style,
      };
      it.fontSize = parseInt(fontSize, 10);
    } else { /* empty */ }
  }
  GetGroupedTextLayers();
}

function SelectGroup(family, style, fontSize) {
  const allTexts = GetAllTexts();
  const result = [];
  for (let i = 0; i < allTexts.length; i += 1) {
    const layer = allTexts[i];
    if (!(layer.fontName.family !== family
      || layer.fontName.style !== style || layer.fontSize !== Number(fontSize))) {
      result.push(layer);
    } else { /* empty */ }
  }
  figma.currentPage.selection = result;
}

figma.on('selectionchange', () => {
  GetGroupedTextLayers();
});

figma.ui.onmessage = (msg) => {
  if (msg.type === 'load') {
    CreateAvailableFontsList().then();
    figma.ui.resize(400, 320);
  } else if (msg.type === 'select-all-text-layers') figma.currentPage.selection = figma.currentPage.findAllWithCriteria({ types: ['TEXT'] });
  else if (msg.type === 'set-font') SetFont(msg.payload.id, msg.payload.family, msg.payload.style, msg.payload.fontSize).then();
  else if (msg.type === 'select-group') SelectGroup(msg.payload.family, msg.payload.style, msg.payload.fontSize);
};
