//TODO: baumstruktur?
//TODO: drag & drop?
//FIXME: tab-titel werden nicht aktualisiert wenn man auf "zurück" klickt
//FIXME: tab titel aktualisierung funktioniert nicht immer z.B. bei aktualisierung von suchmaschinen ergebnissen
//FIXME: tab icons gehen beim reload kaputt

var tabs = require("sdk/tabs");
var { viewFor } = require("sdk/view/core");
var data = require("sdk/self").data;
var tab_utils = require("sdk/tabs/utils");
let { getFavicon } = require("sdk/places/favicon");
var preferences = require("sdk/simple-prefs").prefs;
var store = require("sdk/simple-storage");

var sidebar_worker = undefined;

var open_tabs = {};
var tab_ids = [];
var tabs_to_add = [];
var restored_tabs = undefined;
var triggered_events_at_once = 0;

var tree = {};

function store_tab_infos()
{
	var tab_references = {};
	for (let tab of tabs)
	{
		tab_references[tab.index] = {"access_id":tab.access_id, "parent":tab.parent_id};
	}
	store.storage.tab_references = tab_references;
	console.log(tab_references);
}

exports.onUnload = function (reason) {
	store_tab_infos();
};

var sidebar = require("sdk/ui/sidebar").Sidebar({
	id: 'tabbar',
	title: 'TabSideBar',
	url: data.url("sidebar_content.html"),
	contentScriptFile: [data.url("jquery.min.js")],
	onHide: function () {
		console.log("hiding");
		store_tab_infos();
	},
	onAttach: function (worker) {
		open_tabs = {};
		tab_ids = [];
		if (store.storage.tab_references != undefined)
		{
			console.log("restore tab relations: "+store.storage.tab_references);
			restored_tabs = store.storage.tab_references;
		}
		worker.port.on("ping", function() {
			worker.port.emit("pong");
			sidebar_worker = worker;
			list_tabs();
		});
		worker.port.on("click", function (id) {
			activate_clicked_tab(id);
			highlight_tab(id);
		});

		worker.port.on("close", function (id) {
			close_tab(id);
		})
	}
});

if (preferences["show_after_startup"] == true)
{
	sidebar.show();
}


function highlight_tab(tab_id)
{
	sidebar_worker.port.emit("highlight", tab_id);
}

function add_to_tree(tab_id, children, parent_id)
{
	console.log("tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}

	tree[tab_id] = {"children": children, "parent":parent_id, "indentation_level":0};
	if (parent_id != null)
	{
		tree[tab_id]["indentation_level"] = (tree[parent_id]["indentation_level"] + 1);
		tree[parent_id]["children"].unshift(tab_id);
	}
	
	console.log("tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}
}

function remove_from_tree(tab_id, parent_id)
{
	console.log("tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}

	var index = tree.indexOf(tab_id);
	tree[parent_id]["children"].splice(index, 1)
	var new_parent = tree[parent_id]["children"][0];
	var new_children = tree[new_parent]["children"]
	var content = tree[tab_id];
	var old_children = content["children"];
	if (new_children.length != 0)
	{
		//TODO: einrückung der kinder rekursiv um 1 erhöhen
		content["children"] = new_children.push.apply(old_children);
	}
	tree[new_parent] = content;
	var old_indentation_level = tree[new_parent]["indentation_level"];
	tree[new_parent]["indentation_level"] = (old_indentation_level + 1);
	tree[tab_id] = undefined;

	console.log("tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}
}

tabs.on('ready', function(loaded_tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	console.log("EVENT: ready");
	update_tab(loaded_tab, loaded_tab.access_id);
});

tabs.on('open', function (tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	triggered_events_at_once = 1
	console.log("EVENT: open");
	move_tab_next_to_active(tab);
	var parent_tab = tabs.activeTab;

	//wenn der neue tab leer ist
	if (tab.readyState == "complete")
	{
		if (parent_tab.parent_id != undefined)
		{
			tab.parent_id = parent_tab.parent_id;
		}
		add_tab(tab, "inserted");
	}
	else
	{
		if (parent_tab.access_id != undefined)
		{
			tab.parent_id = parent_tab.access_id;
		}
		add_tab(tab, undefined);
	}
});

tabs.on("activate", function (tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	console.log("EVENT: activate");
	if (triggered_events_at_once != 0)
	{
		triggered_events_at_once = 0;
		return;
	}
	if (tab.access_id != undefined)
	{
		sidebar_worker.port.emit("highlight", tab.access_id);
	}
});

tabs.on("close", function (tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	console.log("EVENT: close");
	remove_tab(tab);
});

function close_tab(id)
{
	var tab = open_tabs[id];
	tab.close();
}

function add_tab(tab, type)
{
	if (sidebar_worker == undefined)
	{
		return;
	}

	if (type == "new")
	{
		new_id = tab_ids.length;
		tab_ids.push(new_id);
		open_tabs[new_id] = tab;
		tab.access_id = new_id;

		var parent_tab = tabs.activeTab;
		var parent_tab_parent_id = tree[parent_tab.access_id]["parent"];

		//TODO: das vielleicht mit nem eventhandler für strg+n?
		//wenn der neue tab leer ist
		if (tab.readyState == "complete")
		{
			if (parent_tab_parent_id == null)
			{
				add_to_tree(tab.access_id, [], null);
			}
			else
			{
				add_to_tree(tab.access_id, [], parent_tab_parent_id);
			}
		}
		else
		{
			add_to_tree(tab.access_id, [], parent_tab.access_id);
		}

		var subsequent_tab = undefined;

		for (let open_tab of tabs)
		{
			var tab_access_id = open_tab.access_id;
			if (open_tab.index == (tab.index + 1))
			{
				subsequent_tab = tab_access_id;
			}
		}
	}

	getFavicon(tab, function (url) {
		var tab_object = {"id":tab.access_id, "title":tab.title, "sub_tab":subsequent_tab, "indentation_level": tree[tab.access_id]["indentation_level"]};
		if (url == null)
		{
			sidebar_worker.port.emit("add_tab", tab_object);
		}
		else
		{
			tab_object["icon"] = url;
			sidebar_worker.port.emit("add_tab", tab_object);
		}
	});
}

function update_tab(tab, id)
{
	open_tabs[id] = tab;
	getFavicon(tab, function (url) {
		var tab_object = {"id":tab.access_id, "title":tab.title};
		if (url == null)
		{
			sidebar_worker.port.emit("update_tab", tab_object);
		}
		else
		{
			tab_object["icon"] = url;
			sidebar_worker.port.emit("update_tab", tab_object);
		}
	});
}

function remove_tab(tab)
{
	open_tabs[tab.access_id] = undefined;
	sidebar_worker.port.emit("remove_tab", {"id":tab.access_id, "title":tab.title});
}

function list_tabs()
{
	var open_tabs_count = tabs.length;
	var added_tabs_count = 1;
	for (let tab of tabs)
	{
		if (restored_tabs != undefined)
		{
			if (restored_tabs[tab.index] != undefined)
			{
				tab.was_restored = true;
			}
		}

		if (open_tabs_count == added_tabs_count)
		{
			add_tab(tab, "highlight");
		}
		else
		{
			add_tab(tab, undefined)
		}
		added_tabs_count = (added_tabs_count + 1)
	}
}

function activate_clicked_tab(id)
{
	var tab = open_tabs[id];
	var lowLevelTab = viewFor(tab);
	tab_utils.activateTab(lowLevelTab)
}

function move_tab_next_to_active(tab) {
	const low_level_tab = viewFor(tab);
	const low_level_browser = tab_utils.getTabBrowserForTab(low_level_tab);
	const index = get_subsequent_tab_index(tab.window);
	low_level_browser.moveTabTo(low_level_tab, index);
}

function get_subsequent_tab_index(window) {
	//in neuem fenster
	if (window.tabs.length === 0)
	{
		return 0;
	}
	else
	{
		return tabs.activeTab.index + 1;
	}
}


