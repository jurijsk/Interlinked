// This file holds the main code for the plugin. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).

//console.log((<VectorNode>figma.currentPage.selection[0]).vectorNetwork)
//console.log((<VectorNode>figma.currentPage.selection[0]).vectorPaths)

const OTHER_SIDE_ID_KEY = "otherSideId";
const FAUIL_MISERABLY = true;
const EXPECTED_TXT_NODE_NAME = 'interlink';

let reactionTemplate: Action = {
	destinationId: undefined,
	navigation: "NAVIGATE",
	preserveScrollPosition: false,
	resetVideoPosition: false,
	transition: null,
	type: "NODE"
};

type Interlinkable = InstanceNode | FrameNode;
function interlink(thisSide: Interlinkable, otherSide: Interlinkable) {
	if (!thisSide) {
		figma.closePlugin("Nothing to link here.");
		return;
	}
	let thisSideInterlink = thisSide.findOne(n => n.type === "TEXT" && n.name === EXPECTED_TXT_NODE_NAME) as TextNode;

	if (!otherSide) {
		//if only one node is selected try to recover the the other side from destinationId
		let otherSideId = thisSide.getPluginData(OTHER_SIDE_ID_KEY);

		otherSide = <Interlinkable>figma.getNodeById(otherSideId);
		if (!otherSide) {
			figma.closePlugin("Can not find pairing component instance");
			return;
		}
	}

	if (thisSideInterlink) {
		thisSideInterlink.hyperlink = createHyperlink(otherSide.id);
	}

	let otherSideInterlink = otherSide.findOne(n => n.type === "TEXT" && n.name === EXPECTED_TXT_NODE_NAME) as TextNode
	if (otherSideInterlink) {
		otherSideInterlink.hyperlink = createHyperlink(thisSide.id);
	}

	if (!thisSideInterlink || !otherSideInterlink) {
		figma.closePlugin(`Selected component do not have text layer named '${EXPECTED_TXT_NODE_NAME}'.`);
	}


	const interactionsEnabled = figma.currentPage.getPluginData(INTERACTIONS_TOGGLE) == INTERACTIONS_TOGGLE_ON ? true : false;
	if (interactionsEnabled) {
		thisSide.reactions = [createReaction(otherSide.id)];
		otherSide.reactions = [createReaction(thisSide.id)];
	}
	//Prepare ground to relink the nodes if one was copy pasted.
	thisSide.setPluginData(OTHER_SIDE_ID_KEY, otherSide.id);
	otherSide.setPluginData(OTHER_SIDE_ID_KEY, thisSide.id);
	thisSide.setRelaunchData({ interlink: "Use after cut/paste" });
	otherSide.setRelaunchData({ interlink: "Use after cut/paste" });


	//figma.currentPage.flowStartingPoints = figma.currentPage.flowStartingPoints.slice(0, figma.currentPage.flowStartingPoints.length - 1);

	figma.closePlugin(interactionsEnabled ? "With" : "Without" + " interactions. Interlinked.");
}

function createHyperlink(destinationId: string): HyperlinkTarget {
	return {
		type: "NODE",
		value: destinationId
	}
}

function createReaction(destinationId: string): Reaction {
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
	}
}

function getInteractables(selection: readonly SceneNode[]) {
	let interlinkables = new Array<Interlinkable>();
	for (let i = 0; i < selection.length; i++) {
		const node = selection[i];
		if (node.type == "FRAME" || node.type == "INSTANCE") {
			interlinkables.push(node);
		}
	}
	return interlinkables;
}

function dispatch() {
	let interlinkables = getInteractables(figma.currentPage.selection);
	if (interlinkables.length == 0) {
		figma.closePlugin("Select two component instances to interlink");
		return;
	} else if (interlinkables.length > 2) {
		figma.closePlugin("Can't interlink more then two nodes");
		return;
	}
	interlink(interlinkables[0], interlinkables[1]);
}

const INTERACTIONS_TOGGLE = 'interactions_toggle';
const INTERACTIONS_TOGGLE_OFF = 'off';
const INTERACTIONS_TOGGLE_ON = 'on';

function setupGlobalRelaunchCommands() {
	const commands: { [key: string]: string } = {}

	let interactions_toggle = figma.currentPage.getPluginData(INTERACTIONS_TOGGLE) || INTERACTIONS_TOGGLE_ON;
	commands[INTERACTIONS_TOGGLE] = "Currently " + interactions_toggle;

	figma.currentPage.parent.setRelaunchData(commands);
}

function toggleInteractionLinking() {
	let interactions_toggle = figma.currentPage.getPluginData(INTERACTIONS_TOGGLE);
	if (!interactions_toggle) {
		interactions_toggle = INTERACTIONS_TOGGLE_ON; //set to on by default
	} else {
		interactions_toggle = interactions_toggle === INTERACTIONS_TOGGLE_ON
			? INTERACTIONS_TOGGLE_OFF
			: INTERACTIONS_TOGGLE_ON
	}
	figma.currentPage.setPluginData(INTERACTIONS_TOGGLE, interactions_toggle);
	setupGlobalRelaunchCommands();
	figma.closePlugin(`Prototype Interactions linking are now ${interactions_toggle}.`);
}

function setInteractionLinking(value: "on" | "off") {
	figma.currentPage.setPluginData(INTERACTIONS_TOGGLE, value);
	setupGlobalRelaunchCommands();
}


let EXPERIMENT_KEY = 'experiment';
function setupExperiment() {
	let commnads = figma.currentPage.getRelaunchData();
	commnads[EXPERIMENT_KEY] = "Launch me";
	figma.currentPage.setRelaunchData(commnads);
}

// Runs this code if the plugin is run in Figma
if (figma.editorType === 'figma') {
	if (figma.command == INTERACTIONS_TOGGLE) {
		toggleInteractionLinking();
	} else if (figma.command == EXPERIMENT_KEY) {
		console.log("before createInterlinkComponent")
		createInterlinkComponent();
	} else if (figma.command == "with_hyperlinks") {
		setInteractionLinking(INTERACTIONS_TOGGLE_OFF);
		dispatch();
	} else if (figma.command == "with_both") {
		setInteractionLinking(INTERACTIONS_TOGGLE_ON);
		dispatch();
	} else { //launch from command menu
		//default action
		setupGlobalRelaunchCommands()
		dispatch();

		setupExperiment();
	}
}

function experiment() {
	figma.notify("This is an experiment. I wonder how much text i can fit here. I know about 100 character but what happends in the re is no enought space for that", {
		button: {
			text: "Learn more",
			action: () => {
				figma.notify("Here is some more");
				return true;
			}
		}
	});
}



/**
 * Creates a new component that represents a ticket status
 * @param statusColor RGB value for status color
 * @param statusName Name of status
 * @returns A component that represent a ticket
 */
async function createInterlinkComponent() {
	
	// Create the main frame
	var component = figma.createComponent()
	component.name = "interlink";
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
			{ color: { r: 0.8392156958580017, g: 0.8470588326454163, b: 0.8980392217636108, a: 1 }, position: 1 }]
	}]
	background.effects = [
		{ type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: -2, y: -2 }, radius: 15, spread: 4, color: { r: 1, g: 1, b: 1, a: 1 } }
		, { type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 3, y: 3 }, radius: 15, spread: 0, color: { r: 0.2, g: 0.2, b: 0.2, a: 0.81 } }
		, { type: "INNER_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 2, y: 2 }, radius: 2, spread: -2, color: { r: 1, g: 1, b: 1, a: 0.75 } }
		, { type: "INNER_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: -1, y: -1 }, radius: 2, spread: -1, color: { r: 0, g: 0, b: 0, a: 0.6 } }
	]
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
		]}
	];



	let FONT = { family: "Sarpanch", style: "Regular" };
	await figma.loadFontAsync(FONT).then(() => {

		let text = figma.createText();
		text.fontName = FONT
		text.fontSize = 16
		text.autoRename = false
		text.characters = "Jump to the other side"
		text.textAutoResize = "WIDTH_AND_HEIGHT";
		text.name = EXPECTED_TXT_NODE_NAME
		
		text.effects = [
			{ type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 0, y: 0 }, radius: 2, spread: 0, 
			color: { r: 1, g: 1, b: 1, a: .25 } }
		];



		component.appendChild(text);




		component.counterAxisSizingMode = "AUTO"
		component.primaryAxisSizingMode = "AUTO"

		//component.resize(200, 40);
		component.x = Math.round(figma.viewport.center.x - (component.width / 2));
		component.y = Math.round(figma.viewport.center.y - (component.height / 2));

		let icon = figma.createVector();
		icon.name = 'icon';
		icon.vectorPaths = [{data: iconLeftData, windingRule: "EVENODD"}]
		icon.constrainProportions = true
		icon.fills = [{type: "SOLID", color: { r: 0, g: 0, b: 0 }}];
		icon.strokes = [];
		icon.locked = true;

		let iconBox = figma.createFrame();
		iconBox.resize(24,24)
		iconBox.constrainProportions = true
		iconBox.fills = [];
		iconBox.locked = true;
		
		iconBox.appendChild(icon);
		iconBox.name = 'icon';
		icon.x = 1.5;
		icon.y = 6.5;
		icon.constraints = {horizontal: "SCALE", vertical: "SCALE"};
		icon.effects = [
			{ type: "DROP_SHADOW", visible: true, blendMode: "NORMAL", offset: { x: 0, y: 0 }, radius: 2, spread: 0, 
			color: { r: 1, g: 1, b: 1, a: .25 } }
		];
		
		component.appendChild(iconBox);
		
		component.setRelaunchData({ interlink: "" });




		let thisSide =  component.createInstance();
		//console.log(component.x);
		thisSide.x = component.x;
		thisSide.y = component.y + component.height + 80;


		figma.closePlugin("go away");
	});


	return component
}


const iconLeftData = "M 12.579127693176268 0.33518269790833294 C 12.784025573730467 0.0012821631495806285 13.215891265869141 -0.10022280552300744 13.543726539611816 0.10846505526067082 L 20.67099914550781 4.645419364635437 C 20.875666046142577 4.775702982818368 21 5.00418197435787 21 5.25 C 21 5.49581802564213 20.875666046142577 5.724297017181633 20.67099914550781 5.8545802954035 L 13.543726539611816 10.39153474288745 C 13.215891265869141 10.600222561175995 12.784025573730467 10.498716986947763 12.579127693176268 10.16481674965494 C 12.374231147766112 9.83091651236212 12.473891639709473 9.391061290446869 12.801728248596191 9.182373472158323 L 18.979242134094235 5.25 L 12.801728248596191 1.3176259329098174 C 12.473891639709473 1.1089380721261393 12.374231147766112 0.6690832539146516 12.579127693176268 0.33518269790833294 Z M 5.154545211791992 1.4259955759733653 C 4.158778095245361 1.4259955759733653 3.20379478931427 1.8288806272054976 2.4996808767318726 2.546020585775576 C 1.795567047595978 3.2631606293359203 1.4 4.235811158428655 1.4 5.25 C 1.4 6.264188841571345 1.795567047595978 7.2368395406446115 2.4996808767318726 7.953979244243893 C 2.848322868347168 8.309071294367753 3.262220525741577 8.59074535329887 3.71774263381958 8.782919902907121 C 4.173264741897583 8.975093772593247 4.661490535736084 9.074004084065573 5.154545211791992 9.074004084065573 L 7.827272605895995 9.074004084065573 C 8.213871574401855 9.074004084065573 8.527272605895995 9.393202365222438 8.527272605895995 9.786954107522886 C 8.527272605895995 10.18070516990121 8.213871574401855 10.499904130980198 7.827272605895995 10.499904130980198 L 5.154545211791992 10.499904130980198 C 4.477641201019287 10.499904130980198 3.807365012168884 10.364112123691434 3.181986045837402 10.100279221353182 C 2.556607580184936 9.836446998937056 1.988375115394592 9.449741289630962 1.5097314834594726 8.962243244407075 C 0.5430666685104371 7.97769492800758 0 6.642360848270845 0 5.25 C 0 3.857638811768092 0.5430667519569398 2.5223049870021557 1.5097314834594726 1.5377569255734578 C 2.4763962149620053 0.55320886414476 3.7874748706817623 0.00009545263804782956 5.154545211791992 0.00009545263804782956 L 7.827272605895995 0.00009545263804782956 C 8.213871574401855 0.00009545263804782956 8.527272605895995 0.31929402269126783 8.527272605895995 0.7130454675257861 C 8.527272605895995 1.1067969123603043 8.213871574401855 1.4259955759733653 7.827272605895995 1.4259955759733653 L 5.154545211791992 1.4259955759733653 Z M 6.236364364624023 5.250000339961064 C 6.236364364624023 4.856248937621678 6.549764728546142 4.53705031650375 6.936364364624023 4.53705031650375 L 14.063636970520019 4.53705031650375 C 14.450235939025879 4.53705031650375 14.763636970520018 4.856248937621678 14.763636970520018 5.250000339961064 C 14.763636970520018 5.643752082261512 14.450235939025879 5.9629503634183765 14.063636970520019 5.9629503634183765 L 6.936364364624023 5.9629503634183765 C 6.549764728546142 5.9629503634183765 6.236364364624023 5.643752082261512 6.236364364624023 5.250000339961064 Z";