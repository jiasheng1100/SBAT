class LocalAjax {
    constructor(dispatcher, maxFragmentLength) {
        this.dispatcher = dispatcher;
        this.maxFragmentLength = maxFragmentLength;
        this.collection = null;
        this.document = null;

        this.dispatcher.on('ajax', this, this.localExecution.bind(this));
    }

    findType(entityTypes, type) {
        for (const entityType of entityTypes) {
            if (entityType.type === type) {
                return entityType;
            } else if (entityType.children && entityType.children.length) {
                const result = this.findType(entityType.children, type);
                if (result !== null) {
                    return result;
                }
            }
        }
        return null;
    }

    createAnnotation(data) {
        const attrs = JSON.parse(data.attributes);
        const offsets = JSON.parse(data.offsets);
        let e_type = this.findType(data.collection.entity_types, data.type);
        let e_id = "";

        if (!e_type) {
            e_type = data.collection.event_types.find(x => x.type === data.type);
            if (e_type) {
                const trigger_id = `T${this.document.triggers.length + 1}`;
                e_id = `E${this.document.triggers.length + 1}`;
                data.document.triggers.push([trigger_id, data.type, offsets]);
                data.document.events.push([e_id, trigger_id, []]);
            }
        } else {
            e_id = `N${this.document.entities.length + 1}`;
            const new_offsets = this.splitTooLongFragment(offsets, data, e_id);
            data.document.entities.push([e_id, data.type, new_offsets]);
        }

        for (const key in attrs) {
            if (attrs.hasOwnProperty(key) && attrs[key]) {
                data.document.attributes.push([
                    `A${this.document.attributes.length + 1}`,
                    key,
                    e_id,
                    attrs[key]
                ]);
            }
        }

        if (data.comment.length) {
            data.document.comments.push([e_id, "AnnotatorNotes", data.comment]);
        }

        return {
            data: data,
            action: data.action,
            annotations: {
                source_files: data.document.source_files,
                modifications: data.document.modifications,
                normalizations: data.document.normalizations,
                text: data.document.text,
                entities: data.document.entities,
                attributes: data.document.attributes,
                relations: data.document.relations,
                triggers: data.document.triggers,
                events: data.document.events,
                comments: data.document.comments
            },
            edited: [[e_id]],
            messages: [],
            protocol: 1
        };
    }

    splitTooLongFragment(offsets, data, e_id) {
        let new_offsets = [];

        if (
            this.maxFragmentLength > 0 &&
            offsets.find(x => x[1] - x[0] > this.maxFragmentLength)
        ) {
            offsets.forEach(fragment => {
                const from = fragment[0];
                const to = fragment[1];
                const subtext = data.document.text.substring(from, to);

                if (to - from > this.maxFragmentLength) {
                    const from_end = from + subtext.indexOf(' ');
                    const to_start = to - (subtext.length - (subtext.lastIndexOf(' ') + 1));
                    new_offsets.push([from, from_end]);
                    new_offsets.push([to_start, to]);

                    data.document.attributes.push([
                        `A${this.document.attributes.length + 1}`,
                        LONG_ANNOTATION_CONST,
                        e_id,
                        [from, to]
                    ]);
                } else {
                    new_offsets.push([from, to]);
                }
            });
        } else {
            new_offsets = offsets;
        }

        return new_offsets;
    }

    editAnnotation(data) {
        let e_type = {};
        const attrs = JSON.parse(data.attributes);
        const offsets = JSON.parse(data.offsets);

        if (data.id.startsWith("E")) {
            const annotation = data.document.events.find(x => x[0] === data.id);
            const trigger_id = annotation[1];
            const trigger = data.document.triggers.find(x => x[0] === trigger_id);
            trigger[1] = data.type;
            trigger[2] = offsets;
            e_type = data.collection.event_types.find(x => x.type === data.type);
        } else if (data.id.startsWith("N")) {
            const entity = data.document.entities.find(x => x[0] === data.id);
            entity[1] = data.type;
            entity[2] = this.splitTooLongFragment(offsets, data, data.id);
            e_type = this.findType(data.collection.entity_types, data.type);
        }

        if (e_type) {
            const existing_attrs = data.document.attributes.filter(x => x[2] === data.id);
            existing_attrs.forEach(attr => {
                const index = data.document.attributes.indexOf(attr);
                data.document.attributes.splice(index, 1);
            });

            for (const key in attrs) {
                if (attrs.hasOwnProperty(key) && attrs[key]) {
                    data.document.attributes.push([
                        `A${this.document.attributes.length + 1}`,
                        key,
                        data.id,
                        attrs[key]
                    ]);
                }
            }

            if (data.comment.length) {
                const comment = data.document.comments.find(x => x[0] === data.id);
                if (comment) {
                    comment[2] = data.comment;
                } else {
                    data.document.comments.push([data.id, "AnnotatorNotes", data.comment]);
                }
            }

            return {
                data: data,
                action: data.action,
                annotations: {
                    source_files: data.document.source_files,
                    modifications: data.document.modifications,
                    normalizations: data.document.normalizations,
                    text: data.document.text,
                    entities: data.document.entities,
                    attributes: data.document.attributes,
                    relations: data.document.relations,
                    triggers: data.document.triggers,
                    events: data.document.events,
                    comments: data.document.comments
                },
                edited: [[data.id]],
                messages: [],
                protocol: 1
            };
        } else {
            return {}; //TODO: Error handling
        }
    }

    deleteAnnotation(data) {
        const entities = data.document.entities;
        for (let i = 0; i < entities.length; i++) {
            if (entities[i][0] === data.id) {
                entities.splice(i, 1);
                break;
            }
        }

        const relations = data.document.relations;
        for (let i = relations.length - 1; i >= 0; i--) {
            const relation = relations[i][2];
            if (relation[0][1] === data.id || relation[1][1] === data.id) {
                relations.splice(i, 1);
            }
        }

        return {
            action: data.action,
            annotations: data.document,
            edited: [],
            messages: [],
            protocol: 1
        };
    }

    createRelation(data) {
        let e_type = data.collection.relation_types.find(x => x.type === data.type);

        if (!e_type) {
            e_type = data.document.events.find(x => x[0] === data.origin);
            if (e_type) {
                e_type[2].push([data.type, data.target]);
            }
        } else {
            const obj = [
                `R${this.document.relations.length + 1}`,
                data.type,
                [
                    [e_type.args[0].role, data.origin],
                    [e_type.args[1].role, data.target]
                ]
            ];
            data.document.relations.push(obj);
        }

        return {
            action: data.action,
            annotations: {
                source_files: data.document.source_files,
                modifications: data.document.modifications,
                normalizations: data.document.normalizations,
                text: data.document.text,
                entities: data.document.entities,
                attributes: data.document.attributes,
                relations: data.document.relations,
                triggers: data.document.triggers,
                events: data.document.events
            },
            edited: [[data.origin], [data.target]],
            messages: [],
            protocol: 1
        };
    }

    editRelation(data) {
        let e_type = data.collection.relation_types.find(x => x.type === data.type);

        if (!e_type) {
            e_type = data.document.events.find(x => x[0] === data.origin);
        } else {
            const relation = data.document.relations.find(
                x => x[1] === data.old_type && x[2][0][1] === data.origin && x[2][1][1] === data.old_target
            );
            relation[1] = data.type;
            relation[2] = [
                [e_type.args[0].role, data.origin],
                [e_type.args[1].role, data.target]
            ];
        }

        return {
            action: data.action,
            annotations: {
                source_files: data.document.source_files,
                modifications: data.document.modifications,
                normalizations: data.document.normalizations,
                text: data.document.text,
                entities: data.document.entities,
                attributes: data.document.attributes,
                relations: data.document.relations,
                triggers: data.document.triggers,
                events: data.document.events,
                comments: data.document.comments
            },
            edited: [[data.origin], [data.target]],
            messages: [],
            protocol: 1
        };
    }

    localExecution(data, callback, merge) {
        this.dispatcher.post('spin');
        this.dispatcher.post('local-ajax-begin', [data]);
        this.collection = data.collection;
        this.document = data.document;
        let response = {};

        switch (data.action) {
            case "getDocument":
                //TODO
                break;
            case "loadConf":
                //TODO
                break;
            case "getCollectionInformation":
                //TODO
                break;
            case "createArc":
                response = data.old_target || data.old_type ? this.editRelation(data) : this.createRelation(data);
                break;
            case "deleteArc":
            //TODO
            case "reverseArc":
                //TODO
                break;
            case "createSpan":
                response = data.id ? this.editAnnotation(data) : this.createAnnotation(data);
                break;
            case "deleteSpan":
                response = this.deleteAnnotation(data);
                break;
            case "deleteFragmentxyz?":
                //TODO
                break;
            case "splitSpan":
                //TODO
                break;
            case "tag":
                //TODO ??
                const obj = {
                    collection: data.collection,
                    document: data.document,
                    tagger: data.tagger
                };
                break;
            case "login":
            case "logout":
            case "whoami":
            case "normGetName":
            case "normSearch":
            case "suggestSpanTypes":
            case "importDocument":
            case "deleteDocument":
            case "deleteCollection":
            case "undo":
            case "normData":
            case "InDocument":
            case "InCollection":
            case "storeSVG":
            case "getDocumentTimestamp":
            case "saveConf":
                break;
            default:
                //TODO
                break;
        }

        this.dispatcher.post(0, callback, [response]);
        this.dispatcher.post('local-ajax-done', [response]);
        this.dispatcher.post('unspin');
    }
}

export default LocalAjax;