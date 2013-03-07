/* See license.txt for terms of usage */

define([
    "firebug/lib/object",
    "firebug/lib/domplate",
    "firebug/lib/dom",
    "firebug/lib/css",
    "firebug/lib/array",
    "firebug/lib/string",
    "firebug/lib/trace",
    "domplate/domTree",
    "firebug/dom/toggleBranch",
],
function(Obj, Domplate, Dom, Css, Arr, Str, FBTrace, DomTree, ToggleBranch) {
with (Domplate) {

// ********************************************************************************************* //
// Constants

var Trace = FBTrace.to("DBG_DOMBASETREE");
var TraceError = FBTrace.to("DBG_ERRORS");

// ********************************************************************************************* //
// DOM Tree Implementation

function DomBaseTree(provider)
{
    this.provider = provider;
    this.toggles = new ToggleBranch.ToggleBranch();
}

/**
 * @domplate
 */
var BaseTree = DomTree.prototype;
DomBaseTree.prototype = domplate(BaseTree,
/** @lends DomBaseTree */
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    refresh: function(parentNode, input)
    {
        parentNode = parentNode || this.parentNode;
        input = input || this.input;

        // Re-render the tree content. Use the current parent element and input object.
        var toggles = new ToggleBranch.ToggleBranch();

        this.saveState(toggles);
        this.replace(parentNode, input);

        // Restore expanded state.
        // xxxHonza: the restoration process should start at the point when the
        // first level of members is available (can be asynchronous).
        this.restoreState(input.object, toggles);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    saveState: function(state)
    {
        if (!this.element)
            return;

        var rows = this.element.querySelectorAll(".memberRow.opened");
        for (var i=0; i<rows.length; i++)
        {
            var row = rows[i];
            var path = this.getPath(row);

            // Mark the path in the toggle tree
            var toggles = state;
            for (var j=0; j<path.length; ++j)
            {
                var name = path[j];
                if (toggles.get(name))
                    toggles = toggles.get(name);
                else
                    toggles = toggles.set(name, new ToggleBranch.ToggleBranch());
            }
        }
    },

    restoreState: function(object, toggles, level)
    {
        object = object || this.input.object;
        level = level || 0;

        // Don't try to expand children if there are no expanded items.
        if (toggles.isEmpty())
            return;

        var members = this.getMembers(object, level);
        for (var i=0; i<members.length; i++)
        {
            var member = members[i];

            // Don't expand if the member doesn't have children any more.
            if (!member.hasChildren)
                continue;

            var name = this.provider.getId(member);
            var newToggles = toggles.get(name);
            if (!newToggles)
                continue;

            // Get the member's object (the value) and expand it.
            var value = member.value;
            var promise = this.expandObject(value);

            // If no children are expanded bail out.
            if (newToggles.isEmpty())
                continue;

            if (promise)
            {
                var self = this;
                promise.then(function()
                {
                    self.restoreState(value, newToggles, level+1);
                })
            }
            else
            {
                this.restoreState(value, newToggles, level+1);
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    toggleRow: function(row, forceOpen)
    {
        if (!row)
            return;

        var member = row.repObject;
        if (!member)
            return;

        var level = parseInt(row.getAttribute("level"));
        if (forceOpen && Css.hasClass(row, "opened"))
            return;

        // Handle long strings. These don't have children, but can be shortened and
        // expanding them allows the user to see the entire string.
        var rowValue = this.getValue(member);
        var isString = typeof(rowValue) == "string";
        if (isString)
        {
            if (Css.hasClass(row, "opened"))
            {
                Css.removeClass(row, "opened");
                row.lastChild.firstChild.textContent = '"' + Str.cropMultipleLines(rowValue) + '"';
            }
            else
            {
                Css.setClass(row, "opened");
                row.lastChild.firstChild.textContent = '"' + rowValue + '"';
            }

            return;
        }

        return BaseTree.toggleRow.apply(this, arguments);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Auto Expanding

    getPath: function(row)
    {
        var name = this.getRowName(row);
        var path = [name];

        var level = parseInt(row.getAttribute("level"), 10) - 1;
        for (row = row.previousSibling; row && level >= 0; row = row.previousSibling)
        {
            if (parseInt(row.getAttribute("level"), 10) === level)
            {
                name = this.getRowName(row);
                path.splice(0, 0, name);

                --level;
            }
        }

        return path;
    },

    getRowName: function(row)
    {
        var object = row.repObject;
        return this.provider.getId(object);
    }

});

// ********************************************************************************************* //
// Helpers

function isPromise(object)
{
    return object && typeof(object.then) == "function";
}

// ********************************************************************************************* //
// Registration

return DomBaseTree;

// ********************************************************************************************* //
}});

