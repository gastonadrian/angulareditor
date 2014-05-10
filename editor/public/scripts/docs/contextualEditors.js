
/*
EDITOR TYPES:
    BUILT WITH DIRECTIVES (example: image editor), could be singleton or not
    EDITORS THAT ARE WRAPPERS FOR 3RD PARTY LIBRARIES
                
*************** EDITORS BUILT WITH DIRECTIVES ****************            
var editorName = {    
    isSingleton: true/false,    //the editor is a singleton
    canvasHover: true/false,    //the editor provies custom features on mouse over
    getScope: function(){},     // how to get custom directive scope
    definition: function(scope, options){}
};

registration:
    // would be a factory function in case of multiple instances
    // would be an object with all the methods in case of singleton

    editorDefinition.definition = editorDefinition.definition(editorDefinition.getScope(rootScope), options);
    editorTypes[name] = editorDefinition;

init:

    var editorInstance = new editorDefinition.definition(contentTypeContainer, contentTypeChildren, options);

***************************************************************
****** EDITORS THAT ARE WRAPPERS FOR 3RD PARTY LIBRARIES ******
                    
var editorName = {
    isSingleton: true/false,    //the editor is a singleton
    canvasHover: true/false,    //the editor provies custom features on mouse over
    definition: function(options){}
};

registration:
    editorDefinition.definition = editorDefinition.definition(options);
    editorTypes[name] = editorDefinition;

init:

    var editorInstance = new editorDefinition.definition(contentTypeContainer, contentTypeChildren, options);

***************************************************************
******************** DEFINITION FUNCTION **********************
        
definition: function(options){     
    --------------------------------------------------
    if the editor is singleton

    //closure init code
                
    return { // all the common editors wrapper interface
        init: init, => init(contentTypeContainer, contentTypeChildren, options) //constructor for instance (made changes to the html that are necessary just one)
        show: show,
        performAction: performAction,
        getId: getId
    };
    --------------------------------------------------
    if the editor could have multiple instances

    // closure code common to all instances

    return function(contentTypeContainer, contentTypeChildren, options){

        return{ // all the common editors wrapper interface
            show: show,
            performAction: performAction,
            getId: getId
        };
    };
    -------------------------------------------------
}

*/