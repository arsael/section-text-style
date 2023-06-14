// import figma from './node_modules/@figma/plugin-typings/index';
// import __html__ from './node_modules/@figma/plugin-typings/index';

figma.showUI(__html__);

async function CreateAvailableFontsList() {
    const availableFonts = await figma.listAvailableFontsAsync();
    const fontsMap = new Map();
    for (const it of availableFonts) {
        if (fontsMap.has(it.fontName.family))
            fontsMap.get(it.fontName.family).push(it.fontName.style)
        else
            fontsMap.set(it.fontName.family, [it.fontName.style]);
    }
    figma.ui.postMessage({ payload:[...fontsMap.entries()], type:'available-fonts-list'});
}
function GetAllTexts() {
    const selection = figma.currentPage.selection;
    const allTexts = [];
    if (selection.length > 0) {
        for (let i = 0; i < selection.length; i += 1) {
            if (selection[i].type === 'TEXT') {
                allTexts.push(selection[i]);
            } else {
                allTexts.push(...selection[i].findAllWithCriteria({types: ['TEXT']}));
            }
        }
    }
    return allTexts;
}
function GetGroupedTextLayers() {
    const layersMap = new Map();
    const allTexts = GetAllTexts();
    for (const it of allTexts) {
        let textStyle;
        if (figma.getStyleById(it.textStyleId) !== null) {
            textStyle = figma.getStyleById(it.textStyleId).name;
        } else {
            textStyle = '–';
        }
        let key = `${it.fontName.family}#${it.fontName.style}#${it.fontSize}#${textStyle}`;
        if (layersMap.has(key))
            layersMap.get(key).push(it.id);
        else
            layersMap.set(key, [it.id]);
    }
    figma.ui.postMessage({ payload:[...layersMap.entries()], type:'grouped-text-layers'});
}

async function SetFont(id, family, style, fontSize) {
    await figma.loadFontAsync({ family:family, style:style });
    const allTexts = GetAllTexts();
    for (const it of allTexts) {
        if (it.id !== id)
            continue;
        it.fontName = { family:family, style:style };
        it.fontSize = parseInt(fontSize);
    }
    GetGroupedTextLayers();
}

figma.on("selectionchange", () => {
    GetGroupedTextLayers();
});

figma.ui.onmessage = (msg) => {
    if (msg.type === 'load')
        CreateAvailableFontsList();
    else if (msg.type === 'select-all-text-layers')
        figma.currentPage.selection = figma.currentPage.findAllWithCriteria({ types:['TEXT'] });
    else if (msg.type === 'set-font') {
        SetFont(msg.payload.id, msg.payload.family, msg.payload.style, msg.payload.fontSize);
        console.log(msg.payload.fontSize);
    }
};