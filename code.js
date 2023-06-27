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

// function cutProperties(allTexts = GetAllTexts()) {
//   return allTexts.map((text) => {
//     const cut = {};
//     cut.textLayerStyle = figma.getStyleById(text.textStyleId) !== null ?
//     figma.getStyleById(text.textStyleId).name : '–';
//     cut.fontFamily = text.fontName.family;
//     cut.fontStyle = text.fontName.style;
//     cut.fontSize = text.fontSize;
//     cut.id = text.id;
//     return cut;
//   });
// }
//
// function groupLayersByProperties(layers = cutProperties(), properties = defaultProps) {
//   const result = [];
//   for (let i = 0; i < layers.length; i++){
//     const layer = layers[i];
//     const matchingGroup = result.find((group) => {
//       // eslint-disable-next-line no-restricted-syntax
//       for (const prop of properties) {
//         if (layer[prop] !== group[prop]) {
//           return false;
//         }
//       }
//       return true;
//     });
//     if (matchingGroup) {
//       matchingGroup.ids.push(layer.id);
//     } else {
//       const newGroup = {};
//       for (const prop of properties) {
//         newGroup[prop] = layer[prop];
//       }
//       newGroup.ids = [layer.id];
//       result.push(newGroup);
//     }
//   }
//   return result;
// }

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

figma.on('selectionchange', () => {
  GetGroupedTextLayers();
});

figma.ui.onmessage = (msg) => {
  if (msg.type === 'load') {
    CreateAvailableFontsList().then();
    figma.ui.resize(400, 320);
  } else if (msg.type === 'select-all-text-layers') figma.currentPage.selection = figma.currentPage.findAllWithCriteria({ types: ['TEXT'] });
  else if (msg.type === 'set-font') {
    SetFont(msg.payload.id, msg.payload.family, msg.payload.style, msg.payload.fontSize).then();
  }
};
