
var tabs = require("sdk/tabs");
var { viewFor } = require("sdk/view/core");
var data = require("sdk/self").data;
var tab_utils = require("sdk/tabs/utils");
var sidebar_worker = undefined;

var open_tabs = {};

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
		worker.port.on("click", function (index) {
			console.log(index);
			activate_clicked_tab(index);
		});

		worker.port.on("close", function (index) {
			console.log("close: "+index);
			close_tab(index);
		})
	}
});

tabs.on('ready', function(loaded_tab) {
	console.log('tab is loaded', loaded_tab.title, loaded_tab.url);
	update_tab(loaded_tab);
});

tabs.on('open', function (tab) {
	add_tab(tab);
});

tabs.on("close", function (tab) {
	remove_tab(tab);
})

function close_tab(index)
{
	var tab = open_tabs[index];
	tab.close();
}

function add_tab(tab)
{
	if (sidebar_worker != undefined)
	{
		open_tabs[tab.index] = tab;
		sidebar_worker.port.emit("add_tab", {"index":tab.index, "title":tab.title});
	}
}

function update_tab(tab)
{
	sidebar_worker.port.emit("update_tab", {"index":tab.index, "title":tab.title});
}

function remove_tab(tab)
{
	open_tabs[tab.index] = undefined;
	sidebar_worker.port.emit("remove_tab", {"index":tab.index, "title":tab.title});
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

function activate_clicked_tab(index)
{
	var tab = open_tabs[index];
	var lowLevelTab = viewFor(tab);
	tab_utils.activateTab(lowLevelTab)
}
