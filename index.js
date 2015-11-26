//FIXME: bei session restore werden die wiederhergestellten tabs alle als children des ersten tabs re-added
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
var last_close = undefined;

require("sdk/simple-prefs").on("clear_tree", function() {
	tree = {};
});

function store_tab_infos()
{
	var tab_references = {};
	for (let tab of tabs)
	{
		tab_references[tab.index] = tab.access_id;
	}
	store.storage.tab_references = tab_references;
	store.storage.tree = tree;
	console.log(tab_references);
}

var sidebar = require("sdk/ui/sidebar").Sidebar({
	id: 'tabbar',
	title: 'TabSideBar',
	url: data.url("sidebar_content.html"),
	contentScriptFile: [data.url("jquery.min.js")],
	onAttach: function (worker) {
		open_tabs = {};
		tab_ids = [];
		if (store.storage.tab_references != undefined && store.storage.tree != undefined)
		{
			console.log("restore tab references: "+store.storage.tab_references);
			restored_tabs = store.storage.tab_references;
			tree = store.storage.tree;
		}
		worker.port.on("ping", function() {
			worker.port.emit("pong");
			sidebar_worker = worker;
			list_tabs();
		});
		worker.port.on("tab_added", function() 
		{
			if (tabs_to_add.length == 0)
			{
				highlight_tab(tabs.activeTab.access_id);
			}
			else
			{
				var next_tab_id = tabs_to_add.shift();
				var next_tab = undefined;
				for (let tab of tabs)
				{
					if (tab.access_id == next_tab_id)
					{
						if (!(tab.access_id in tree))
						{
							add_to_tree(tab.access_id, null);
						}
						next_tab = tab;
						break;
					}
				}
				add_tab(next_tab, "initial");
			}
		});
		worker.port.on("click", function (id) {
			activate_clicked_tab(id);
			highlight_tab(id);
		});

		worker.port.on("close", function (id) {
			console.log("MAIN CLOSE: "+id);
			if (id != last_close)
			{
				close_tab(id);
				last_close = id;
			}
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

function add_to_tree(tab_id, parent_id)
{
	console.log("tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}

	tree[tab_id] = {"children": [], "parent":parent_id, "indentation_level":0};
	if (parent_id != null)
	{
		if (!(parent_id in tree))
		{
			tree[tab_id]["indentation_level"] = 0;
		}
		else
		{
			tree[tab_id]["indentation_level"] = (tree[parent_id]["indentation_level"] + 1);
			tree[parent_id]["children"].push(tab_id);
		}
	}
	
	console.log("tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}
}

function remove_from_tree(tab_id)
{
	console.log("remove "+tab_id+", tree:");
	for (key in tree)
	{
		console.log(key)
		console.log(tree[key]);
	}

	var parent_id = tree[tab_id]["parent"];
	console.log("PARENT ID: "+parent_id);
	console.log("TREE OBJECT: ");
	console.log(tree[tab_id]);

	//TODO: der code ist noch buggy, soll aber kind-tabs des geschlossenen nach oben rücken
	if (tree[tab_id]["children"].length > 0)
	{
		if (parent_id != null)
		{
			console.log("parent_id: ");
			console.log(parent_id);
			var index = tree[parent_id]["children"].indexOf(tab_id);
			tree[parent_id]["children"].splice(index, 1);
			var replace_parent = tree[parent_id]["children"][0];
		}
		else
		{
			var replace_parent = tree[tab_id]["children"][0];
		}

		console.log("replace parent: ");
		console.log(replace_parent);
		if (replace_parent != undefined)
		{
			var replace_children = tree[replace_parent]["children"];
			var content = tree[tab_id];
			var old_children = content["children"];
			for (var child_index in old_children)
			{
				var child_id = old_children[child_index];
				console.log("child: "+child_id);
				var child = tree[child_id];
				child["parent"] = replace_parent;
			}

			if (replace_children.length != 0)
			{
				//TODO: einrückung der kinder rekursiv um 1 erhöhen
				content["children"] = replace_children.push.apply(old_children);
			}

			var old_indentation_level = tree[replace_parent]["indentation_level"];
			content["indentation_level"] = (old_indentation_level - 1);
			content["parent"] = parent_id;
			tree[replace_parent] = content;
			console.log("replace: "+tree[replace_parent]);
		}
	}

	delete tree[tab_id];

	console.log("removed, tree:");
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
	triggered_events_at_once = 1;
	console.log("EVENT: open");
	move_tab_next_to_active(tab);
	add_tab(tab, "new");
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
	console.log("EVENT: close: "+tab.access_id);
	remove_tab(tab);
});

function close_tab(id)
{
	var tab = open_tabs[id];
	console.log(tab);
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
		//new_id = tab_ids.length;
		new_id = parseInt(Math.random() * (999999999 - 0));
		console.log(new_id);
		if (new_id in tab_ids)
		{
			new_id = new_id+"_"+tab_ids.length;
		}
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
				console.log("NO PARENT");
				add_to_tree(tab.access_id, null);
			}
			else
			{
				console.log("PARENT OF PARENT");
				add_to_tree(tab.access_id, parent_tab_parent_id);
			}
		}
		else
		{
			console.log("PARENT");
			add_to_tree(tab.access_id, parent_tab.access_id);
			console.log("added: ");
			console.log(tree[tab.access_id]);
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

	store_tab_infos();
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
	tab_id = tab.access_id;
	open_tabs[tab_id] = undefined;
	remove_from_tree(tab_id);
	sidebar_worker.port.emit("remove_tab", {"id":tab_id, "title":tab.title});
	store_tab_infos();
}

function list_tabs()
{
	var open_tabs_count = tabs.length;
	var added_tabs_count = 1;
	var first_tab = undefined;
	for (let tab of tabs)
	{
		if (restored_tabs != undefined)
		{
			console.log("restore")
			if (restored_tabs[tab.index] != undefined)
			{
				var restored_tab_id = restored_tabs[tab.index]
				tab.access_id = restored_tab_id;
				tab_ids.push(tab.access_id);
				open_tabs[tab.access_id] = tab;
			}
		}

		if (tab.access_id == undefined)
		{
			//new_id = tab_ids.length;
			new_id = parseInt(Math.random() * (999999999 - 0));
			console.log(new_id);
			if (new_id in tab_ids)
			{
				new_id = new_id+"_"+tab_ids.length;
			}
			tab_ids.push(new_id);
			open_tabs[new_id] = tab;
			tab.access_id = new_id;
		}
		if (added_tabs_count == 1)
		{
			first_tab = tab;
			if (!(tab.access_id in tree))
			{
				add_to_tree(tab.access_id, null);
			}
		}
		else
		{
			tabs_to_add.push(tab.access_id);
		}
		added_tabs_count = (added_tabs_count + 1);
	}
	add_tab(first_tab, "first");
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


