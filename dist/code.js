// This file holds the main code for the plugin. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).
//console.log((<VectorNode>figma.currentPage.selection[0]).vectorNetwork)
//console.log((<VectorNode>figma.currentPage.selection[0]).strokes)
const document = figma.currentPage.parent;
const PROP_OTHER_SIDE_ID_KEY = "otherSideId";
const FAUIL_MISERABLY = true;
const EXPECTED_TXT_NODE_NAME = 'interlink';
const PADDING = 20;
const DEFAULT_COMPONENT_NAME = "interlink";
const DOCUMENT_PROP_INTERACTIONS_TOGGLE = 'prop_interactions_toggle';
const DEPRECATED_DOCUMENT_PROP_COMPONENT_NAME_KEY = "component_name";
const DOCUMENT_PROP_COMPONENT_ID_KEY = "component_id";
const PROP_INTERLINK_DEFAULT_COMPONENT_MARK_KEY = "interlink_default_component";
function removeDocumentPluginData() {
    document.setPluginData(DEPRECATED_DOCUMENT_PROP_COMPONENT_NAME_KEY, ""); //remove this after few versions. deprecated
    document.setPluginData(DOCUMENT_PROP_INTERACTIONS_TOGGLE, "");
    document.setPluginData(DOCUMENT_PROP_COMPONENT_ID_KEY, "");
}
const VALUE_INTERACTIONS_TOGGLE_OFF = 'off';
const VALUE_INTERACTIONS_TOGGLE_ON = 'on';
const CMD_INTERACTIONS_TOGGLE = 'toggle_interactions';
const CMD_INTERLINK = 'interlink';
const CMD_CREATE_N_INTERLINK = 'create_n_interlink';
const CMD_EXPERIMENT_KEY = 'experiment';
function getMain(instance) {
    console.log(instance);
    let component = instance.mainComponent;
    if (component.parent && component.parent.type == "COMPONENT_SET") {
        component = component.parent;
    }
    return component;
}
async function createNode(alike) {
    let component;
    if (alike) {
        component = getMain(alike);
    }
    else {
        component = await ensureDefaultComponent();
    }
    if (component.type == "COMPONENT_SET") {
        return component.defaultVariant.createInstance();
    }
    return component.createInstance();
}
function cloneNode(thisSide) {
    let clone = thisSide.clone();
    return clone;
}
var InterlinkResult;
(function (InterlinkResult) {
    InterlinkResult[InterlinkResult["NoInerlinkText"] = 0] = "NoInerlinkText";
    InterlinkResult[InterlinkResult["Interlinked"] = 1] = "Interlinked";
    InterlinkResult[InterlinkResult["WithInteractions"] = 3] = "WithInteractions";
    InterlinkResult[InterlinkResult["NotDefault"] = 5] = "NotDefault";
})(InterlinkResult || (InterlinkResult = {}));
async function interlink(thisSide = null, otherSide = null) {
    function createHyperlink(destinationId) {
        return { type: "NODE", value: destinationId };
    }
    if (!thisSide) {
        thisSide = await createNode();
        thisSide.x = Math.round(figma.viewport.center.x - thisSide.width - PADDING / 2);
        thisSide.y = Math.round(figma.viewport.center.y + thisSide.height + 80);
    }
    if (!otherSide) { //other side not selected
        //try to get other side
        let otherSideId = thisSide.getPluginData(PROP_OTHER_SIDE_ID_KEY);
        otherSide = otherSideId ? figma.getNodeById(otherSideId) : null;
        //if other side exists
        if (otherSide) {
            //check if other side is already linked no existing node that is not this side
            let otherSideOtherSideId = otherSide.getPluginData(PROP_OTHER_SIDE_ID_KEY);
            if (otherSideOtherSideId != thisSide.id) {
                let otherSideOtherSide = figma.getNodeById(otherSideOtherSideId);
                if (otherSideOtherSide) {
                    //then do not break existing link, but create new one instead.
                    //this can occur if the only selected node was shift+drag copies
                    otherSide = null;
                }
            }
        }
        if (!otherSide) {
            otherSide = cloneNode(thisSide);
            otherSide.x = Math.round(thisSide.x + thisSide.width + 24);
            otherSide.y = Math.round(thisSide.y);
        }
    }
    let thisSideInterlink = thisSide.findOne(isProperText);
    if (thisSideInterlink) {
        thisSideInterlink.hyperlink = createHyperlink(otherSide.id);
    }
    let otherSideInterlink = otherSide.findOne(isProperText);
    if (otherSideInterlink) {
        otherSideInterlink.hyperlink = createHyperlink(thisSide.id);
    }
    let result = InterlinkResult.NoInerlinkText;
    if (!thisSideInterlink || !otherSideInterlink) {
        handleInterlinkResult(result);
        return;
    }
    result = InterlinkResult.Interlinked;
    const interactionsEnabled = document.getPluginData(DOCUMENT_PROP_INTERACTIONS_TOGGLE) == VALUE_INTERACTIONS_TOGGLE_ON ? true : false;
    if (interactionsEnabled) {
        result |= InterlinkResult.WithInteractions;
        function createReaction(destinationId) {
            return {
                action: {
                    destinationId: destinationId,
                    navigation: "NAVIGATE",
                    preserveScrollPosition: false,
                    resetVideoPosition: false,
                    transition: null,
                    type: "NODE"
                },
                trigger: { type: 'ON_CLICK' }
            };
        }
        thisSide.reactions = [createReaction(otherSide.id)];
        otherSide.reactions = [createReaction(thisSide.id)];
    }
    else {
        //remove interactions?
    }
    //Prepare ground to relink the nodes if one was copy pasted.
    thisSide.setPluginData(PROP_OTHER_SIDE_ID_KEY, otherSide.id);
    otherSide.setPluginData(PROP_OTHER_SIDE_ID_KEY, thisSide.id);
    thisSide.setRelaunchData({ interlink: "Use after cut/paste" });
    otherSide.setRelaunchData({ interlink: "Use after cut/paste" });
    let component = getMain(thisSide);
    let defaultComponentId = document.getPluginData(DOCUMENT_PROP_COMPONENT_ID_KEY);
    if (component.id != defaultComponentId) {
        result |= InterlinkResult.NotDefault;
    }
    handleInterlinkResult(result, component.id);
}
function handleInterlinkResult(result, componentId) {
    if (result === InterlinkResult.NoInerlinkText) {
        figma.closePlugin(`Selected component do not have text layer named '${EXPECTED_TXT_NODE_NAME}' to link to.`);
        return;
    }
    if (result & InterlinkResult.Interlinked) {
        if ((result & InterlinkResult.NotDefault) == InterlinkResult.NotDefault) {
            figma.notify("Interlinked. Non-standard component used.", {
                timeout: 5000,
                onDequeue: (reason) => {
                    figma.closePlugin();
                },
                button: {
                    text: "Set as standard",
                    action: () => {
                        setDefaultComponent(componentId);
                        return true;
                    }
                }
            });
        }
        else {
            figma.closePlugin(((result == InterlinkResult.WithInteractions) ? "With interactions. " : "") + "Interlinked.");
        }
    }
}
const isProperText = (node) => { return node.type == "TEXT" && node.name == EXPECTED_TXT_NODE_NAME; };
//called on invocation from Command Palette
function dispatch() {
    function getGoodSelection(seelction) {
        if (seelction.length == 0) {
            return [];
        }
        if (seelction.length > 2) {
            return null;
        }
        let thisSide = seelction[0];
        if (thisSide.type != "INSTANCE") {
            return null;
        }
        let thisText = thisSide.findOne(isProperText);
        if (!thisText) {
            return null;
        }
        let otherSide = seelction[1];
        if (!otherSide) {
            //one proper instance selected;
            return [thisSide];
        }
        if (otherSide.type != "INSTANCE") {
            return null;
        }
        let otherText = thisSide.findOne(isProperText);
        if (!otherText) {
            return null;
        }
        return [thisSide, otherSide];
    }
    let goodSelection = getGoodSelection(figma.currentPage.selection);
    if (goodSelection) {
        interlink(goodSelection[0], goodSelection[1]);
    }
    else {
        figma.notify("Can not interlink with current selection", {
            timeout: 5000,
            onDequeue: (reason) => {
                figma.closePlugin();
            },
            button: {
                text: "Create nodes & Interlink",
                action: () => {
                    interlink();
                    return false; //do not close the plugin just yet, we might create the default component and load fonts
                }
            }
        });
    }
}
function setupGlobalState() {
    const commands = {};
    let interactions_toggle = document.getPluginData(DOCUMENT_PROP_INTERACTIONS_TOGGLE);
    if (!interactions_toggle) {
        interactions_toggle = VALUE_INTERACTIONS_TOGGLE_OFF;
        document.setPluginData(DOCUMENT_PROP_INTERACTIONS_TOGGLE, interactions_toggle);
    }
    commands[CMD_INTERACTIONS_TOGGLE] = "Currently " + interactions_toggle;
    commands[CMD_CREATE_N_INTERLINK] = "";
    document.setRelaunchData(commands);
}
function toggleInteractionLinking() {
    let interactions_toggle = document.getPluginData(DOCUMENT_PROP_INTERACTIONS_TOGGLE);
    if (!interactions_toggle) {
        interactions_toggle = VALUE_INTERACTIONS_TOGGLE_OFF; //set to on by default
    }
    else {
        interactions_toggle = interactions_toggle === VALUE_INTERACTIONS_TOGGLE_ON
            ? VALUE_INTERACTIONS_TOGGLE_OFF
            : VALUE_INTERACTIONS_TOGGLE_ON;
    }
    document.setPluginData(DOCUMENT_PROP_INTERACTIONS_TOGGLE, interactions_toggle);
    setupGlobalState();
    figma.closePlugin(`Prototype Interactions linking are now ${interactions_toggle}.`);
}
// Runs this code if the plugin is run in Figma
if (figma.editorType === 'figma') {
    if (figma.command == CMD_INTERACTIONS_TOGGLE) {
        toggleInteractionLinking();
    }
    else if (figma.command == CMD_EXPERIMENT_KEY) {
        experiment();
    }
    else if (figma.command == CMD_INTERLINK) {
        dispatch();
    }
    else { //launch from command menu
        //removeDocumentPluginData() //for debugging
        //default action
        setupGlobalState();
        dispatch();
        //setupExperiment();
        //experiment();
    }
}
function experiment() {
    let selected = figma.currentPage.selection[0];
    if (selected.type == "COMPONENT") {
        console.log(selected, selected.id);
    }
    else if (selected.type == "COMPONENT_SET") {
        console.log(selected, selected.id);
    }
    figma.closePlugin();
    // figma.notify("This is an experiment. I wonder how much text i can fit here. I know about 100 character but what happends in the re is no enought space for that", {
    // 	button: {
    // 		text: "Learn more",
    // 		action: () => {
    // 			figma.notify("Here is some more");
    // 			return true;
    // 		}
    // 	}
    // });
}
async function ensureDefaultComponent() {
    let knownComponentId = document.getPluginData(DOCUMENT_PROP_COMPONENT_ID_KEY);
    let component;
    if (!knownComponentId) {
        component = await setupDefaultComponent();
    }
    else {
        const candidate = figma.getNodeById(knownComponentId);
        if (!candidate) {
            console.log("Can not find Interlinked component");
            //do not really know how this can happen but here we go
            component = await setupDefaultComponent();
        }
        else {
            component = candidate;
        }
    }
    if (!component) {
        removeDocumentPluginData();
        return null;
    }
    return component;
}
async function setupDefaultComponent() {
    let componentset = await createInterlinkComponent();
    setDefaultComponent(componentset.id);
    return componentset;
}
function setDefaultComponent(componentId) {
    document.setPluginData(DOCUMENT_PROP_COMPONENT_ID_KEY, componentId);
}
async function createInterlinkComponent() {
    function createVariant(flip, name) {
        var component = figma.createComponent();
        component.name = name;
        component.layoutMode = "HORIZONTAL";
        component.horizontalPadding = 20;
        component.verticalPadding = 12;
        component.itemSpacing = 12;
        component.clipsContent = false;
        component.resize(10, 10);
        let background = figma.createRectangle();
        background.resize(10, 10);
        background.name = 'bg';
        background.locked = true;
        component.appendChild(background);
        background.layoutPositioning = "ABSOLUTE";
        background.x = 0;
        background.y = 0;
        background.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
        background.cornerRadius = 100;
        background.fills = [{
                type: "GRADIENT_LINEAR",
                gradientTransform: [
                    [0.9, 0.1, 0],
                    [-0.1, 0.1, 0.5],
                ],
                gradientStops: [
                    { color: { r: 0.8549019694328308, g: 0.8549019694328308, b: 0.8941176533699036, a: 1 }, position: 0 },
                    { color: { r: 0.8392156958580017, g: 0.8470588326454163, b: 0.8980392217636108, a: 1 }, position: 1 }
                ]
            }];
        background.effects = [
            { type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: -2, y: -2 }, radius: 15, spread: 4, color: { r: 1, g: 1, b: 1, a: 1 } },
            { type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 3, y: 3 }, radius: 15, spread: 0, color: { r: 0.2, g: 0.2, b: 0.2, a: 0.81 } },
            { type: "INNER_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 2, y: 2 }, radius: 2, spread: -2, color: { r: 1, g: 1, b: 1, a: 0.75 } },
            { type: "INNER_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: -1, y: -1 }, radius: 2, spread: -1, color: { r: 0, g: 0, b: 0, a: 0.6 } }
        ];
        background.strokes = [{
                type: "GRADIENT_LINEAR",
                visible: true,
                blendMode: "NORMAL",
                gradientStops: [
                    { color: { r: 1, g: 1, b: 1, a: 0.21 }, position: 0 },
                    { color: { r: 0.93, g: 0.93, b: 0.93, a: 0 }, position: 0 }
                ],
                gradientTransform: [
                    [0.65, 0.64, -0.18],
                    [-0.64, 0.65, 0.59],
                ]
            }
        ];
        let text = figma.createText();
        text.fontName = FONT;
        text.lineHeight = { value: 24, unit: "PIXELS" };
        text.fontSize = 16;
        text.autoRename = false;
        text.characters = "Jump to the other side";
        text.textAutoResize = "WIDTH_AND_HEIGHT";
        text.name = EXPECTED_TXT_NODE_NAME;
        text.effects = [
            {
                type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 0, y: 0 }, radius: 2, spread: 0,
                color: { r: 1, g: 1, b: 1, a: .25 }
            }
        ];
        let icon = figma.createVector();
        icon.name = 'icon';
        icon.vectorPaths = [{ data: flip ? iconLeftData : iconRightData, windingRule: "EVENODD" }];
        icon.constrainProportions = true;
        icon.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
        icon.strokes = [];
        icon.locked = true;
        let iconBox = figma.createFrame();
        iconBox.resize(24, 24);
        iconBox.constrainProportions = true;
        iconBox.fills = [];
        iconBox.locked = true;
        iconBox.appendChild(icon);
        iconBox.name = 'icon';
        icon.x = 1.5;
        icon.y = 6.5;
        icon.constraints = { horizontal: "SCALE", vertical: "SCALE" };
        icon.effects = [
            {
                type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 0, y: 0 }, radius: 2, spread: 0,
                color: { r: 1, g: 1, b: 1, a: .25 }
            }
        ];
        if (flip) {
            component.appendChild(text);
            component.appendChild(iconBox);
        }
        else {
            component.appendChild(iconBox);
            component.appendChild(text);
        }
        component.counterAxisSizingMode = "AUTO";
        component.primaryAxisSizingMode = "AUTO";
        component.setRelaunchData({ interlink: "" });
        return component;
    }
    let set;
    let FONT = { family: "Consolas", style: "Regular" };
    await figma.loadFontAsync(FONT).then(() => {
        let left = createVariant(true, "flip=true");
        let right = createVariant(false, "flip=false");
        set = figma.combineAsVariants([left, right], figma.currentPage);
        set.name = DEFAULT_COMPONENT_NAME;
        set.layoutMode = "HORIZONTAL";
        set.counterAxisSizingMode = "AUTO";
        set.primaryAxisSizingMode = "AUTO";
        set.paddingTop = PADDING;
        set.paddingRight = PADDING;
        set.paddingBottom = PADDING;
        set.paddingLeft = PADDING;
        set.itemSpacing = 24;
        set.cornerRadius = 5;
        set.strokes = [{ type: "SOLID", color: { r: 0.5921568870544434, g: 0.27843138575553894, b: 1 } }];
        set.strokeAlign = "INSIDE";
        set.dashPattern = [10, 5];
        set.x = Math.round(figma.viewport.center.x - (set.width / 2));
        set.y = Math.round(figma.viewport.center.y - (set.height / 2));
        set.layoutMode = "NONE";
        return set;
    });
    return set;
}
function setupExperiment() {
    let commands = figma.currentPage.getRelaunchData();
    commands[CMD_EXPERIMENT_KEY] = "Experiment";
    figma.currentPage.setRelaunchData(commands);
}
const iconLeftData = "M 12.579127693176268 0.33518269790833294 C 12.784025573730467 0.0012821631495806285 13.215891265869141 -0.10022280552300744 13.543726539611816 0.10846505526067082 L 20.67099914550781 4.645419364635437 C 20.875666046142577 4.775702982818368 21 5.00418197435787 21 5.25 C 21 5.49581802564213 20.875666046142577 5.724297017181633 20.67099914550781 5.8545802954035 L 13.543726539611816 10.39153474288745 C 13.215891265869141 10.600222561175995 12.784025573730467 10.498716986947763 12.579127693176268 10.16481674965494 C 12.374231147766112 9.83091651236212 12.473891639709473 9.391061290446869 12.801728248596191 9.182373472158323 L 18.979242134094235 5.25 L 12.801728248596191 1.3176259329098174 C 12.473891639709473 1.1089380721261393 12.374231147766112 0.6690832539146516 12.579127693176268 0.33518269790833294 Z M 5.154545211791992 1.4259955759733653 C 4.158778095245361 1.4259955759733653 3.20379478931427 1.8288806272054976 2.4996808767318726 2.546020585775576 C 1.795567047595978 3.2631606293359203 1.4 4.235811158428655 1.4 5.25 C 1.4 6.264188841571345 1.795567047595978 7.2368395406446115 2.4996808767318726 7.953979244243893 C 2.848322868347168 8.309071294367753 3.262220525741577 8.59074535329887 3.71774263381958 8.782919902907121 C 4.173264741897583 8.975093772593247 4.661490535736084 9.074004084065573 5.154545211791992 9.074004084065573 L 7.827272605895995 9.074004084065573 C 8.213871574401855 9.074004084065573 8.527272605895995 9.393202365222438 8.527272605895995 9.786954107522886 C 8.527272605895995 10.18070516990121 8.213871574401855 10.499904130980198 7.827272605895995 10.499904130980198 L 5.154545211791992 10.499904130980198 C 4.477641201019287 10.499904130980198 3.807365012168884 10.364112123691434 3.181986045837402 10.100279221353182 C 2.556607580184936 9.836446998937056 1.988375115394592 9.449741289630962 1.5097314834594726 8.962243244407075 C 0.5430666685104371 7.97769492800758 0 6.642360848270845 0 5.25 C 0 3.857638811768092 0.5430667519569398 2.5223049870021557 1.5097314834594726 1.5377569255734578 C 2.4763962149620053 0.55320886414476 3.7874748706817623 0.00009545263804782956 5.154545211791992 0.00009545263804782956 L 7.827272605895995 0.00009545263804782956 C 8.213871574401855 0.00009545263804782956 8.527272605895995 0.31929402269126783 8.527272605895995 0.7130454675257861 C 8.527272605895995 1.1067969123603043 8.213871574401855 1.4259955759733653 7.827272605895995 1.4259955759733653 L 5.154545211791992 1.4259955759733653 Z M 6.236364364624023 5.250000339961064 C 6.236364364624023 4.856248937621678 6.549764728546142 4.53705031650375 6.936364364624023 4.53705031650375 L 14.063636970520019 4.53705031650375 C 14.450235939025879 4.53705031650375 14.763636970520018 4.856248937621678 14.763636970520018 5.250000339961064 C 14.763636970520018 5.643752082261512 14.450235939025879 5.9629503634183765 14.063636970520019 5.9629503634183765 L 6.936364364624023 5.9629503634183765 C 6.549764728546142 5.9629503634183765 6.236364364624023 5.643752082261512 6.236364364624023 5.250000339961064 Z";
const iconRightData = "M 8.420866012573242 10.164812088012695 C 8.215981006622314 10.498712062835693 7.784115940332413 10.600216686725616 7.456275939941406 10.391536712646484 L 0.3290015757083893 5.854577541351318 C 0.12433406710624695 5.7243025451898575 2.1489003586905475e-8 5.495822846889496 2.7858939046182356e-15 5.250002861022949 C -2.149049726029012e-8 5.004182875156403 0.12433391809463501 4.775702431797981 0.3290015757083893 4.645412445068359 L 7.456275939941406 0.10846497118473053 C 7.784115940332413 -0.10022251307964325 8.215981006622314 0.0012825727462768555 8.420866012573242 0.33517804741859436 C 8.625766009092331 0.6690780222415924 8.5261050760746 1.1089378148317337 8.198265075683594 1.317632794380188 L 2.0207555294036865 5.250002861022949 L 8.198265075683594 9.182372093200684 C 8.5261050760746 9.391067072749138 8.625766009092331 9.830912113189697 8.420866012573242 10.164812088012695 Z M 15.845399856567383 9.073997497558594 C 16.841249883174896 9.073997497558594 17.796149849891663 8.671113014221191 18.5002498626709 7.953978061676025 C 19.20449984073639 7.236843109130859 19.60004997253418 6.264182806015015 19.60004997253418 5.250002861022949 C 19.60004997253418 4.2358078956604 19.20449984073639 3.263162851333618 18.5002498626709 2.5460128784179688 C 18.151649862527847 2.1909328997135162 17.73779946565628 1.9092479646205902 17.282249450683594 1.7170829772949219 C 16.826699435710907 1.5249029844999313 16.338449865579605 1.4259928464889526 15.845399856567383 1.4259928464889526 L 13.172730445861816 1.4259928464889526 C 12.78613543510437 1.4259928464889526 12.472724914550781 1.10679292678833 12.472724914550781 0.7130429744720459 C 12.472724914550781 0.3192930221557617 12.786120474338531 0.00009453277743887156 13.172730445861816 0.00009453277743887156 L 15.845399856567383 0.00009453277743887156 C 16.52234983444214 0.00009453277743887156 17.192700386047363 0.13588646054267883 17.818050384521484 0.3997229337692261 C 18.443400382995605 0.6635579168796539 19.01159965991974 1.050257921218872 19.490249633789062 1.5377578735351562 C 20.45699965953827 2.522297739982605 21 3.8576430082321167 21 5.250002861022949 C 21 6.642362713813782 20.45699965953827 7.97769296169281 19.490249633789062 8.962247848510742 C 18.523649632930756 9.946787714958191 17.212499856948853 10.499897956848145 15.845399856567383 10.499897956848145 L 13.172730445861816 10.499897956848145 C 12.78613543510437 10.499897956848145 12.472724914550781 10.180697202682495 12.472724914550781 9.786947250366211 C 12.472724914550781 9.393197298049927 12.78613543510437 9.073997497558594 13.172730445861816 9.073997497558594 L 15.845399856567383 9.073997497558594 Z M 14.763629913330078 5.250002861022949 C 14.763629913330078 5.643752813339233 14.450235605239868 5.962952613830566 14.063640594482422 5.962952613830566 L 6.9363603591918945 5.962952613830566 C 6.549765348434448 5.962952613830566 6.23637056350708 5.643752813339233 6.23637056350708 5.250002861022949 C 6.236355563507459 4.856252908706665 6.549765348434448 4.537052631378174 6.9363603591918945 4.537052631378174 L 14.063640594482422 4.537052631378174 C 14.450235605239868 4.537052631378174 14.763629913330078 4.856252908706665 14.763629913330078 5.250002861022949 Z";
