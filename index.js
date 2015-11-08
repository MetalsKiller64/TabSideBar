//TODO: drag & drop?
//TODO: baumstruktur?
//FIXME: tab-titel werden nicht aktualisiert wenn man auf "zurück" klickt
//TODO: aktiven tab hervorheben

var tabs = require("sdk/tabs");
var { viewFor } = require("sdk/view/core");
var data = require("sdk/self").data;
var tab_utils = require("sdk/tabs/utils");
let { getFavicon } = require("sdk/places/favicon");

var sidebar_worker = undefined;

var open_tabs = {};
var tab_ids = [];

var sidebar = require("sdk/ui/sidebar").Sidebar({
	id: 'tabbar',
	title: 'TabSideBar',
	url: data.url("sidebar_content.html"),
	contentScriptFile: [data.url("jquery.min.js")],
	onAttach: function (worker) {
		open_tabs = {};
		tab_ids = [];
		worker.port.on("ping", function() {
			worker.port.emit("pong");
			sidebar_worker = worker;
			list_tabs();
    	});
		worker.port.on("click", function (id) {
			activate_clicked_tab(id);
			worker.port.emit("clicked", id);
		});

		worker.port.on("close", function (id) {
			close_tab(id);
		})
	}
});

tabs.on('ready', function(loaded_tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	update_tab(loaded_tab, loaded_tab.access_id);
});

tabs.on('open', function (tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	move_tab_next_to_active(tab);
	add_tab(tab);
});

tabs.on("close", function (tab) {
	if (sidebar_worker == undefined)
	{
		return;
	}
	remove_tab(tab);
})

function close_tab(id)
{
	var tab = open_tabs[id];
	tab.close();
}

function add_tab(tab)
{
	if (sidebar_worker != undefined)
	{
		new_id = tab_ids.length;
		tab_ids.push(new_id);
		open_tabs[new_id] = tab;
		tab.access_id = new_id;
		var subsequent_tab = undefined;

		//var tab_reference = undefined;
		for (let open_tab of tabs)
		{
			//target_access_id = open_tabs[tab_id];
			tab_access_id = open_tab.access_id;
			if (open_tab.index == (tab.index + 1))
			{
				subsequent_tab = tab_access_id;
			}
		}

		getFavicon(tab, function (url) {
			if (url == null)
			{
				sidebar_worker.port.emit("add_tab", {"id":tab.access_id, "title":tab.title, "sub_tab":subsequent_tab});
			}
			else
			{
				sidebar_worker.port.emit("add_tab", {"id":tab.access_id, "title":tab.title, "icon":url, "sub_tab":subsequent_tab});
			}
		});
	}
}

function update_tab(tab, id)
{
	open_tabs[id] = tab;
	getFavicon(tab, function (url) {
		if (url == null)
		{
			sidebar_worker.port.emit("update_tab", {"id":tab.access_id, "title":tab.title});
		}
		else
		{
			sidebar_worker.port.emit("update_tab", {"id":tab.access_id, "title":tab.title, "icon":url});
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
	var tabs = require("sdk/tabs");
	for (let tab of tabs)
	{
		add_tab(tab);
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


