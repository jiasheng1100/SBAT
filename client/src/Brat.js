//import $ from './client/lib/node-jquery-1.7.1'; //require('jquery-node-browserify'); // @1.7.2 ++
// <script src="./client/lib/node-jquery-1.7.1"></script>

import Configuration from "./configuration.js"
import Dispatcher from "./dispatcher.js"
import LocalAjax from "./local_ajax.js"
import Visualizer from "./visualizer.js"
import VisualizerUI from "./visualizer_ui.js"
import AnnotatorUI from "./annotator_ui.js"

let dispatcher = new Dispatcher();
console.log(dispatcher)

const LONG_ANNOTATION_CONST = "LongAnnotation";

export class BratFrontendEditor {
    constructor(element, collData = {}, docData = {}, options = {}) {

        // DEFAULT OPTIONS
        const defaultOptions = {
            activateEdition: true,
            overWriteModals: false,
            showTooltip: false,
            assetsPath: "static/",
            maxFragmentLength: 40,
            showTooltip: true,
            overWriteModals: false,
            /*
            webFontURLs: [
                'fonts/Astloch-Bold.ttf',
                'fonts/PT_Sans-Caption-Web-Regular.ttf',
                'fonts/Liberation_Sans-Regular.ttf'
            ],
            */
            ajax: 'local' // 'local', 'external' or 'normal'
        };

        // If option defined, over-write defaultOptions
        this.options = { ...defaultOptions, ...options };
        this.element = element;
        this.collData = collData;
        this.docData = docData;
        this.init();
    }

    init() {
        console.log("init")
        const html = `<div id='brat-frontend-editor'>
            <div id="commentpopup"></div>
            <div id="svg"></div>

            <!-- Options dialog -->
            <form id="options_form" class="dialog" title="Options">
            <fieldset id="options_form_visual">
                <legend>Visual options</legend>
                <div class="optionRow">
                    <span class="optionLabel">Abbreviate labels</span>
                    <span id="label_abbreviations" class="radio_group small-buttons">
                        <input type="radio" id="label_abbreviations_off" value="off" name="label_abbrev_radio" />
                        <label for="label_abbreviations_off" title="Always display full form of labels.">Off</label>
                        <input type="radio" id="label_abbreviations_on" value="on" name="label_abbrev_radio"
                            checked="checked" />
                        <label for="label_abbreviations_on"
                            title="Abbreviate annotation labels in limited space.">On</label>
                    </span>
                </div>
                <div class="optionRow">
                    <span class="optionLabel">Text background</span>
                    <span id="text_backgrounds" class="radio_group small-buttons">
                        <input type="radio" id="text_backgrounds_blank" value="blank" name="text_background_radio" />
                        <label for="text_backgrounds_blank" title="Blank white text backgrounds.">Blank</label>
                        <input type="radio" id="text_backgrounds_striped" value="striped" name="text_background_radio"
                            checked="checked" />
                        <label for="text_backgrounds_striped"
                            title="Striped text backgrounds with every second sentence on light gray background.">Striped</label>
                    </span>
                </div>
                <div class="optionRow">
                    <span class="optionLabel">Layout density</span>
                    <span id="layout_density" class="radio_group small-buttons">
                        <input type="radio" id="layout_density1" value="1" name="layout_radio" />
                        <label for="layout_density1"
                            title="Dense annotation layout: minimizes space taken by annotations.">Dense</label>
                        <input type="radio" id="layout_density2" value="2" name="layout_radio" checked="checked" />
                        <label for="layout_density2"
                            title="Normal annotation layout density: balances between annotation size and readability.">Normal</label>
                        <input type="radio" id="layout_density3" value="3" name="layout_radio" />
                        <label for="layout_density3"
                            title="Spacious annotation layout: allows extra space for annotations to improve readability.">Spacious</label>
                    </span>
                </div>
                <div class="optionRow">
                    <span class="optionLabel">Visualization width</span>
                    <input id="svg_width_value" maxlength="3" size="3" value="100" style="text-align:right" />
                    <span id="svg_width_unit" class="radio_group small-buttons">
                        <input type="radio" id="svg_width_unit_percent" value="%" name="svg_width_radio"
                            checked="checked" />
                        <label for="svg_width_unit_percent">percent</label>
                        <input type="radio" id="svg_width_unit_pixels" value="px" name="svg_width_radio" />
                        <label for="svg_width_unit_pixels">pixels</label>
                    </span>
                </div>
                <div class="optionRow small-buttons">
                    <span class="optionLabel">Paging</span>
                    size
                    <input id="paging_size" maxlength="3" size="3" value="10" style="text-align:right" />,
                    step
                    <input id="paging_step" maxlength="3" size="3" value="5" style="text-align:right" />
                    sentences
                    <input type="button" id="paging_clear" value="Clear" />
                </div>
            </fieldset>
            <fieldset id="options_form_annotation" class="login">
                <legend>Annotation options</legend>
                <div class="optionRow">
                    <span class="optionLabel">Annotation mode</span>
                    <span id="annotation_speed" class="radio_group small-buttons">
                        <input type="radio" id="annotation_speed1" value="1" name="annspeed_radio" checked="checked" />
                        <label for="annotation_speed1"
                            title="Careful annotation mode: ask for additional confirmation of annotation changes. Suitable for annotators in training and for mature corpora requiring few changes.">Careful</label>
                        <input type="radio" id="annotation_speed2" value="2" name="annspeed_radio" />
                        <label for="annotation_speed2"
                            title="Normal annotation mode. Suitable for standard annotation processes.">Normal</label>
                        <input type="radio" id="annotation_speed3" value="3" name="annspeed_radio" />
                        <label for="annotation_speed3"
                            title="Rapid annotation mode: activate automatic support for speeding up annotation process. Suitable for experienced annotators performing an established task.">Rapid</label>
                        <select id="rapid_model" />
                    </span>
                </div>
                <div class="optionRow">
                    <span class="optionLabel">Type Collapse Limit</span>
                    <input id="type_collapse_limit" maxlength="3" size="3" value="30" style="text-align:right" />
                </div>
            </fieldset>
            <fieldset id="options_form_network">
                <legend>Network options</legend>
                <div class="optionRow">
                    <span class="optionLabel">Collaboration</span>
                    <span class="small-buttons">
                        <input id="autorefresh_mode" type="checkbox" />
                        <label for="autorefresh_mode"
                            title="Toggle the autorefresh mode on/off. When autorefresh is on, the system will periodically check with the server for updates to the document you are working on. This is useful when collaborating on annotation but consumes some resources, so you may wish to turn autorefresh off if there are no simultaneous edits.">Autorefresh</label>
                    </span>
                </div>
            </fieldset>
        </form>

            <!-- Span dialog (view+edit) -->
            <form id="span_form" class="dialog" title="Span">
                <!-- Span dialog annotated text -->
                <fieldset id="span_selected_fset">
                    <legend>Text</legend>
                    <a target="brat_linked" id="span_highlight_link" href="#">Link</a>
                    <div id="span_selected" />
                </fieldset>
                <!-- Span dialog search links -->
                <fieldset id="span_search_fieldset">
                    <legend>Search</legend>
                    <div id="span_search_links" />
                </fieldset>
                <!-- Span dialog type selector -->
                <fieldset>
                    <div id="entity_and_event_wrapper" class="split_wrapper">
                        <div id="span_entity_section" class="wrapper_half_left">
                            <div id="entity_label" class="label-like">
                                Entity type
                            </div>
                            <div id="entity_types" class="scroll_wrapper_upper">
                                <div class="scroller"></div>
                            </div>
                            <!-- NOTE: the attribute labels must be *outside* of the
                            divs they logically belong to prevent scrollers
                         overflowing them. -->
                            <div id="entity_attribute_label" class="label-like wrapper_lower_label">
                                Entity attributes
                            </div>
                            <div id="entity_attributes" class="scroll_wrapper_lower">
                                <div class="scroller small-buttons"></div>
                            </div>
                        </div>
                        <div id="span_event_section" class="wrapper_half_right">
                            <div id="event_label" class="label-like">
                                Event type
                            </div>
                            <div id="event_types" class="scroll_wrapper_upper">
                                <div class="scroller"></div>
                            </div>
                            <div id="event_attribute_label" class="wrapper_lower_label label-like">
                                Event attributes
                            </div>
                            <div id="event_attributes" class="scroll_wrapper_lower">
                                <div class="scroller small-buttons"></div>
                            </div>
                        </div>
                    </div>
                </fieldset>
                <!-- Span dialog normalization -->
                <fieldset id="norm_fieldset">
                    <legend>Normalization</legend>
                    <div id="norm_container">
                        <select id="span_norm_db" />
                        <a id="span_norm_db_link" target="brat_linked" href="#" title="Search DB"><img class="brat-fugue-shadowless-magnifier" src="static/img/Fugue-shadowless-magnifier.png" style="vertical-align: middle" /></a>
                        <span class="span_norm_label">ID:</span>
                        <input id="span_norm_id" class="span_norm_id_input"
                            style="width:20%" />
                        <span class="span_norm_label">Ref:</span>
                        <input id="span_norm_txt" class="span_norm_txt_input"
                            readonly="readonly" style="width:45%"
                            placeholder="Click here to search" />
                        <a id="span_norm_ref_link" target="brat_linked" href="#" title="See in DB"><img class="brat-fugue-shadowless-external" src="static/img/Fugue-shadowless-external.png" style="vertical-align: middle" /></a>
                        <input id="clear_norm_button" type="button"
                            value="&#x2715;" title="Clear normalization" />
                    </div>
                </fieldset>
                <!-- Span dialog notes -->
                <fieldset>
                    <legend>Notes</legend>
                    <div id="notes_container">
                        <input id="span_notes" class="borderless" />
                        <input id="clear_notes_button" type="button"
                            value="&#x2715;" title="Clear notes" />
                    </div>
                </fieldset>
            </form>

            <!-- Rapid mode span dialog -->
            <form id="rapid_span_form" class="dialog" title="Span type">
                <fieldset id="rapid_span_selected_fset">
                    <legend>Text</legend>
                    <div id="rapid_span_selected" />
                </fieldset>
                <div id="rapid_span_types" class="scroll_fset" style="height:250px">
                    <fieldset>
                        <legend>Select type</legend>
                        <div class="scroller" id="rapid_span_types_div">
                            <!-- filled dynamically -->
                        </div>
                    </fieldset>
                </div>
            </form>

            <!-- Arc dialog -->
            <form id="arc_form" class="dialog" title="Arc">
                <fieldset id="arc_origin_fset">
                    <legend>From</legend>
                    <a target="brat_linked" id="arc_highlight_link" href="#">Link</a>
                    <div id="arc_origin" />
                </fieldset>

                <fieldset id="arc_target_fset">
                    <legend>To</legend>
                    <div id="arc_target" />
                </fieldset>

                <div id="arc_roles" class="scroll_fset">
                    <fieldset>
                        <legend>Type</legend>
                        <div class="scroller" />
                    </fieldset>
                </div>

                <fieldset id="arc_notes_fieldset">
                    <legend>Notes</legend>
                    <input id="arc_notes" class="borderless" />
                </fieldset>

            </form>

            <!-- Split span annotation dialog -->
            <form id="split_form" class="dialog" title="Split the Span">
                <fieldset>
                    <legend>Split Roles</legend>
                    <div id="split_roles" class="scroll_fset" />
                </fieldset>
            </form>

            <!-- Spinner -->
            <!--<div id="waiter" class="dialog" title="Please wait">
                <img class="brat-spinner" src="static/img/spinner.gif" />
            </div>-->   
        </div>`;
        this.element.innerHTML = html;
        this.setHtmlImgSrc();

        window.Configuration = new Configuration();

        this.dispatcher = new Dispatcher();
        //console.log(this.dispatcher.dispatchers)

        switch (this.options.ajax) {
            case 'local':
                this.ajax = new LocalAjax(this.dispatcher, this.options.maxFragmentLength);
                break;
            case 'normal':
                this.ajax = new Ajax(this.dispatcher);
                break;
            case 'external':
                break;
            default:
                this.ajax = new LocalAjax(this.dispatcher, this.options.maxFragmentLength);
                break;
        }

        //const absoluteWebFontsURLS = this.options.webFontURLs.map(url => `${this.options.assetsPath}${url}`);
        //this.visualizer = new Visualizer(this.dispatcher, 'svg', absoluteWebFontsURLS);
        this.visualizer = new Visualizer(this.dispatcher, 'svg');
        this.svg = this.visualizer.svg;

        if (this.options.activateEdition) {
            this.visualizerUI = new VisualizerUI(this.dispatcher, this.svg, this.options.showTooltip, this.options.overWriteModals);
            this.annotatorUI = new AnnotatorUI(this.dispatcher, this.svg);
        }

        this.dispatcher.post('init');

        if (this.options.maxFragmentLength > 0) {
            this.addLongAnnotationEntityAttribute();
        }

        this.docData.collection = null;
        this.dispatcher.post('collectionLoaded', [this.collData]);
        this.dispatcher.post('requestRenderData', [this.docData]);
        this.dispatcher.post('current', [this.collData, this.docData, {}]);
    }

    addLongAnnotationEntityAttribute() {
        // Special symbol for splitted long annotations
        this.collData.entity_attribute_types.push({
            "name": LONG_ANNOTATION_CONST,
            "type": LONG_ANNOTATION_CONST,
            "values": { LONG_ANNOTATION_CONST: { "glyph": "↹" } }
        });
        this.collData.entity_types.forEach(type => {
            type.attributes.push(LONG_ANNOTATION_CONST);
        });
    }

    setHtmlImgSrc() {
        const spinners = this.element.getElementsByClassName("brat-spinner");
        const magnifiers = this.element.getElementsByClassName("brat-fugue-shadowless-magnifier");
        const externals = this.element.getElementsByClassName("brat-fugue-shadowless-external");

        if (spinners && spinners.length) {
            spinners[0].src = `${this.options.assetsPath}img/spinner.gif`;
        }
        if (magnifiers && magnifiers.length) {
            magnifiers[0].src = `${this.options.assetsPath}img/Fugue-shadowless-magnifier.png`;
        }
        if (externals && externals.length) {
            externals[0].src = `${this.options.assetsPath}img/Fugue-shadowless-external.png`;
        }
    }
}
