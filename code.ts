// This file holds the main code for the plugin. It has access to the *document*.
// You can access browser APIs such as the network by creating a UI which contains
// a full browser environment (see documentation).




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
	if(!thisSide){
		figma.closePlugin("Nothing to link here.");
		return;
	}
	let thisSideInterlink = thisSide.findOne(n => n.type === "TEXT" && n.name === EXPECTED_TXT_NODE_NAME) as TextNode;

	if(!otherSide){
		//if only one node is selected try to recover the the other side from destinationId
		let otherSideId = thisSide.getPluginData(OTHER_SIDE_ID_KEY);

		otherSide = <Interlinkable> figma.getNodeById(otherSideId);
		if(!otherSide){
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

	if(!thisSideInterlink || !otherSideInterlink){
		figma.closePlugin(`Selected component do not have text layer named '${EXPECTED_TXT_NODE_NAME}'.`);
	}
	

	const interactionsEnabled = figma.currentPage.getPluginData(INTERACTIONS_TOGGLE) == INTERACTIONS_TOGGLE_ON ? true : false;
	if(interactionsEnabled){
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

function getInteractables(selection: readonly SceneNode[]){
	let interlinkables = new Array<Interlinkable>();
	for (let i = 0; i < selection.length; i++) {
		const node = selection[i];
		if (node.type == "FRAME" || node.type == "INSTANCE") {
			interlinkables.push(node);
		}
	}
	return interlinkables;
}

function dispatch(){
	let interlinkables = getInteractables(figma.currentPage.selection);
	if(interlinkables.length == 0){
		figma.closePlugin("Select two component instances to interlink");
		return;
	}else if (interlinkables.length > 2){
		figma.closePlugin("Can't interlink more then two nodes");
		return;
	}
	interlink(interlinkables[0], interlinkables[1]);	
}

const INTERACTIONS_TOGGLE = 'interactions_toggle';
const INTERACTIONS_TOGGLE_OFF = 'off';
const INTERACTIONS_TOGGLE_ON = 'on';

function setupGlobalRelaunchCommands(){
	const commands: {[key: string]: string} = {}

	let interactions_toggle = figma.currentPage.getPluginData(INTERACTIONS_TOGGLE) || INTERACTIONS_TOGGLE_ON;
	commands[INTERACTIONS_TOGGLE] = "Currently " + interactions_toggle;
	
	figma.currentPage.parent.setRelaunchData(commands);
}

function toggleInteractionLinking(){
	let interactions_toggle = figma.currentPage.getPluginData(INTERACTIONS_TOGGLE);
	if(!interactions_toggle) {
		interactions_toggle = INTERACTIONS_TOGGLE_ON; //set to on by default
	}else{
		interactions_toggle = interactions_toggle === INTERACTIONS_TOGGLE_ON 
			? INTERACTIONS_TOGGLE_OFF
			: INTERACTIONS_TOGGLE_ON
	}
	figma.currentPage.setPluginData(INTERACTIONS_TOGGLE, interactions_toggle);
	setupGlobalRelaunchCommands();
	figma.closePlugin(`Prototype Interactions linking are now ${interactions_toggle}.`);
}


let EXPERIMENT_KEY = 'experiment';
function setupExperiment(){
	let commnads = figma.currentPage.getRelaunchData();
	commnads[EXPERIMENT_KEY] = "Launch me";
	figma.currentPage.setRelaunchData(commnads);
}

// Runs this code if the plugin is run in Figma
if (figma.editorType === 'figma') {
	if(figma.command == INTERACTIONS_TOGGLE) {
		toggleInteractionLinking();
	} else if (figma.command == EXPERIMENT_KEY) {
		experiment();
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