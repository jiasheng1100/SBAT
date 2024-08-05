class Visualizer {
    constructor(dispatcher, svgId, webFontURLs) {
        this.dispatcher = dispatcher;
        this.svgId = svgId;
        this.webFontURLs = webFontURLs;

        const $svgDiv = $(`#${svgId}`);
        if (!$svgDiv.length) {
            throw new Error(`Could not find container with id="${svgId}"`);
        }

        this.fontLoadTimeout = 5000; // 5 seconds
        this.$svgDiv = $svgDiv;
        this.$svg = null;
        this.svg = null;
        this.data = null;
        this.sourceData = null;
        this.requestedData = null;
        this.coll = null;
        this.doc = null;
        this.args = null;
        this.relationTypesHash = null;
        this.isRenderRequested = false;
        this.isCollectionLoaded = false;
        this.entityAttributeTypes = null;
        this.eventAttributeTypes = null;
        this.spanTypes = null;
        this.highlightGroup = null;
        this.arcDragOrigin = null;

        this.commentPrioLevels = [
            'Unconfirmed', 'Incomplete', 'Warning', 'Error', 'AnnotatorNotes',
            'AddedAnnotation', 'MissingAnnotation', 'ChangedAnnotation'
        ];

        this.roundCoordinates = true; // try to have exact pixel offsets
        this.boxTextMargin = { x: 0, y: 1.5 }; // effect is inverse of "margin" for some reason
        this.highlightRounding = { x: 3, y: 3 }; // rx, ry for highlight boxes
        this.spaceWidths = {
            ' ': 4,
            '\u00a0': 4,
            '\u200b': 0,
            '\u3000': 8,
            '\u0009': 12, // Unicode tabulation
            '\n': 4
        };
        this.coloredCurlies = true; // color curlies by box BG
        this.arcSlant = 15;
        this.minArcSlant = 8;
        this.arcHorizontalSpacing = 10; // min space boxes with connecting arc
        this.rowSpacing = -5; // for some funny reason approx. -10 gives "tight" packing.
        this.sentNumMargin = 50;
        this.smoothArcCurves = true; // whether to use curves (vs lines) in arcs
        this.smoothArcSteepness = 0.5; // steepness of smooth curves (control point)
        this.reverseArcControlx = 5; // control point distance for "UFO catchers"

        // "shadow" effect settings (note, error, incomplete)
        this.rectShadowSize = 3;
        this.rectShadowRounding = 2.5;
        this.arcLabelShadowSize = 1;
        this.arcLabelShadowRounding = 5;
        this.shadowStroke = 2.5; // TODO XXX: this doesn't affect anything..?

        // "marked" effect settings (edited, focus, match)
        this.markedSpanSize = 6;
        this.markedArcSize = 2;
        this.markedArcStroke = 7; // TODO XXX: this doesn't seem to do anything..?

        this.rowPadding = 2;
        this.nestingAdjustYStepSize = 2; // size of height adjust for nested/nesting spans
        this.nestingAdjustXStepSize = 1; // size of height adjust for nested/nesting spans

        this.highlightSequence = '#FF9632;#FFCC00;#FF9632'; // yellow - deep orange
        this.highlightSpanSequence = this.highlightSequence;
        this.highlightArcSequence = this.highlightSequence;
        this.highlightTextSequence = this.highlightSequence;
        this.highlightDuration = '2s';
        this.highlightMatchSequence = '#FFFF00'; // plain yellow

        this.fragmentConnectorDashArray = '1,3,3,3';
        this.fragmentConnectorColor = '#000000';

        this.forceRedraw = () => {
            if (!$.browser.chrome) return; // not needed
            $svg.css('margin-bottom', 1);
            setTimeout(() => { $svg.css('margin-bottom', 0); }, 0);
        };

        this.rowBBox = (span) => {
            const box = { ...span.rectBox }; // clone
            const { x, y } = span.chunk.translation;
            box.x += x;
            box.y += y;
            return box;
        };

        this.commentPriority = (commentClass) => {
            if (commentClass === undefined) return -1;
            const len = this.commentPrioLevels.length;
            for (let i = 0; i < len; i++) {
                if (commentClass.indexOf(this.commentPrioLevels[i]) !== -1) return i;
            }
            return 0;
        };

        this.clearSVG = () => {
            this.data = null;
            this.sourceData = null;
            this.svg.clear();
            this.$svgDiv.hide();
        };

        this.setMarked = (markedType) => {
            this.args[markedType]?.forEach((marked) => {
                if (marked[0] === 'sent') {
                    this.data.markedSent[marked[1]] = true;
                } else if (marked[0] === 'equiv') {
                    this.sourceData.equivs.forEach((equiv) => {
                        if (equiv[1] === marked[1]) {
                            const len = equiv.length;
                            for (let i = 2; i < len; i++) {
                                if (equiv[i] === marked[2]) {
                                    const arcLen = len - 3;
                                    for (let j = 1; j <= arcLen; j++) {
                                        const arc = this.data.eventDescs[`${equiv[0]}*${j}`].equivArc;
                                        arc.marked = markedType;
                                    }
                                    return;
                                }
                            }
                        }
                    });
                } else if (marked.length === 2) {
                    markedText.push([parseInt(marked[0], 10), parseInt(marked[1], 10), markedType]);
                } else {
                    const span = this.data.spans[marked[0]];
                    if (span) {
                        if (marked.length === 3) {
                            span.outgoing.forEach((arc) => {
                                if (arc.target === marked[2] && arc.type === marked[1]) {
                                    arc.marked = markedType;
                                }
                            });
                        } else {
                            span.marked = markedType;
                        }
                    } else {
                        const eventDesc = this.data.eventDescs[marked[0]];
                        if (eventDesc) {
                            const relArc = eventDesc.roles[0];
                            this.data.spans[eventDesc.triggerId].outgoing.forEach((arc) => {
                                if (arc.target === relArc.targetId && arc.type === relArc.type) {
                                    arc.marked = markedType;
                                }
                            });
                        } else {
                            Object.values(this.data.eventDescs).forEach((eventDesc) => {
                                if (eventDesc.triggerId === marked[0]) {
                                    this.data.spans[eventDesc.id].marked = markedType;
                                }
                            });
                        }
                    }
                }
            });
        };

        this.fragmentComparator = (a, b) => {
            const aSpan = a.span;
            const bSpan = b.span;
            let tmp;

            tmp = aSpan.fragments.length - bSpan.fragments.length;
            if (tmp) return tmp < 0 ? 1 : -1;

            tmp = aSpan.avgDist - bSpan.avgDist;
            if (tmp) return tmp < 0 ? -1 : 1;

            tmp = aSpan.numArcs - bSpan.numArcs;
            if (tmp) return tmp < 0 ? -1 : 1;

            const ad = a.to - a.from;
            const bd = b.to - b.from;
            tmp = ad - bd;
            if (aSpan.numArcs === 0 && bSpan.numArcs === 0) tmp = -tmp;
            if (tmp) return tmp < 0 ? 1 : -1;

            tmp = aSpan.refedIndexSum - bSpan.refedIndexSum;
            if (tmp) return tmp < 0 ? -1 : 1;

            if (aSpan.type < bSpan.type) return -1;
            if (aSpan.type > bSpan.type) return 1;

            return 0;
        };

        this.setData = (_sourceData) => {
            if (!this.args) this.args = {};
            this.sourceData = _sourceData;
            this.dispatcher.post('newSourceData', [this.sourceData]);
            this.data = new DocumentData(this.sourceData.text);

            // collect annotation data
            this.sourceData.entities.forEach((entity) => {
                const span = new Span(entity[0], entity[1], entity[2], 'entity');
                this.data.spans[entity[0]] = span;
            });

            const triggerHash = {};
            this.sourceData.triggers.forEach((trigger) => {
                triggerHash[trigger[0]] = [new Span(trigger[0], trigger[1], trigger[2], 'trigger'), []];
            });

            this.sourceData.events.forEach((eventRow) => {
                const eventDesc = new EventDesc(eventRow[0], eventRow[1], eventRow[2]);
                this.data.eventDescs[eventRow[0]] = eventDesc;
                const trigger = triggerHash[eventDesc.triggerId];
                const span = trigger[0].copy(eventDesc.id);
                span.labelText = trigger[0].labelText;
                trigger[1].push(eventDesc);
                this.data.spans[eventDesc.id] = span;
                eventDesc.roles.forEach((role) => {
                    const arc = new Arc(eventDesc.id, eventDesc.type, eventDesc.triggerId, role.targetId);
                    this.data.arcs.push(arc);
                });
            });

            this.sourceData.equivs.forEach((equiv) => {
                const equivs = this.data.equivs;
                equivs.push({
                    id: equiv[0],
                    labelText: equiv[1],
                    equivSpanIds: equiv.slice(2),
                });
            });

            this.dispatcher.post('newAnnotations', [this.data]);

            this.renderData();
        };

        this.renderData = () => {
            if (!this.data) return;
            const startTime = Date.now();

            const highlightData = this.data;
            this.svg = document.getElementById(this.svgId);

            const spanTypes = highlightData.spanTypes;
            const eventAttributeTypes = highlightData.eventAttributeTypes;
            const entityAttributeTypes = highlightData.entityAttributeTypes;

            this.data.spans = highlightData.spans;
            this.data.eventDescs = highlightData.eventDescs;
            this.data.arcs = highlightData.arcs;

            this.entityAttributeTypes = entityAttributeTypes;
            this.eventAttributeTypes = eventAttributeTypes;
            this.spanTypes = spanTypes;

            this.data.fragments.sort(this.fragmentComparator);

            const makeGradient = (colors, type) => {
                const gradId = `${type}grad${colors.join('-').replace(/#|%|/g, '')}`;
                const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                grad.setAttribute('id', gradId);
                grad.setAttribute('x1', '0%');
                grad.setAttribute('y1', '0%');
                grad.setAttribute('x2', '100%');
                grad.setAttribute('y2', '100%');
                for (let i = 0; i < colors.length; i++) {
                    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                    stop.setAttribute('offset', `${i / (colors.length - 1) * 100}%`);
                    stop.setAttribute('style', `stop-color:${colors[i]};stop-opacity:1`);
                    grad.appendChild(stop);
                }
                this.svg.appendChild(grad);
                return `url(#${gradId})`;
            };

            const makeRect = (x, y, w, h, rx, ry, gradient) => {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', w);
                rect.setAttribute('height', h);
                rect.setAttribute('rx', rx);
                rect.setAttribute('ry', ry);
                rect.setAttribute('fill', gradient);
                return rect;
            };

            const renderFragment = (fragment) => {
                const { span, from, to } = fragment;
                const gradient = makeGradient([span.color, '#ffffff'], 'fragment');
                const rect = makeRect(
                    from, span.rectBox.y, to - from, span.rectBox.height,
                    this.rectShadowRounding, this.rectShadowRounding, gradient
                );
                rect.setAttribute('class', 'spanRect');
                this.svg.appendChild(rect);
            };

            highlightData.fragments.forEach(renderFragment);

            console.log(`Rendered in ${(Date.now() - startTime) / 1000}s`);
        };

        // Other methods and functionalities omitted for brevity.
    }
}

// Example usage:
const dispatcher = {};  // Implement dispatcher with relevant functionalities
const svgId = 'visualization';
const webFontURLs = ['https://example.com/font1.woff', 'https://example.com/font2.woff'];

const visualizer = new Visualizer(dispatcher, svgId, webFontURLs);