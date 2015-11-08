//TODO: wenn ein tab ausgehend von einem anderen geöffnet wird, soll der neue direkt unter dem anderen eingefügt werden
//TODO: drag & drop?

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
		worker.port.on("ping", function() {
			worker.port.emit("pong");
			sidebar_worker = worker;
			list_tabs();
    	});
		worker.port.on("click", function (id) {
			console.log(id);
			activate_clicked_tab(id);
		});

		worker.port.on("close", function (id) {
			console.log("close: "+id);
			close_tab(id);
		})
	}
});

tabs.on('ready', function(loaded_tab) {
	console.log('tab is loaded', loaded_tab.title, loaded_tab.url);
	update_tab(loaded_tab, loaded_tab.access_id);
});

tabs.on('open', function (tab) {
	add_tab(tab);
});

tabs.on("close", function (tab) {
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
		console.log("tab_ids: "+tab_ids);
		console.log("NEW ID: "+new_id);
		tab_ids.push(new_id);
		open_tabs[new_id] = tab;
		tab.access_id = new_id;
		getFavicon(tab, function (url) {
			console.log(url);
			if (url == null)
			{
				sidebar_worker.port.emit("add_tab", {"id":tab.access_id, "title":tab.title});
			}
			else
			{
				sidebar_worker.port.emit("add_tab", {"id":tab.access_id, "title":tab.title, "icon":url});
			}
		});
	}
}

function update_tab(tab, id)
{
	open_tabs[id] = tab;
	console.log("ACCESS_ID: "+tab.access_id);
	getFavicon(tab, function (url) {
		console.log(url);
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
	console.log(sidebar_worker);
	var tabs = require("sdk/tabs");
	for (let tab of tabs)
	{
		console.log(tab.title);
		//sidebar_worker.port.emit("add_tab", tab.title);
		add_tab(tab);
	}
}

function activate_clicked_tab(id)
{
	var tab = open_tabs[id];
	var lowLevelTab = viewFor(tab);
	tab_utils.activateTab(lowLevelTab)
}
