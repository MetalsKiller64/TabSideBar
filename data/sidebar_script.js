
addon.port.emit("ping");

addon.port.on("pong", function() {
	console.log("sidebar script got the reply");
});

function blah()
{
	console.log("blah");
}

var open_tabs = {};

addon.port.on("add_tab", function (tab) {
	console.log(tab)
	tab_index = tab["index"];
	tab_title = tab["title"];
	var tab_container = document.createElement("span");
	var new_tab = document.createElement("button");
	var close_button = document.createElement("button");
	close_button.id = tab_index+"_close";
	close_button.appendChild(document.createTextNode("x"));
	tab_container.id = tab_index;
	if (tab_title.length > 30)
	{
		tab_title_replacement = tab_title.substring(0, 27)+"...";
		new_tab.appendChild(document.createTextNode(tab_title_replacement));
	}
	else
	{
		new_tab.appendChild(document.createTextNode(tab_title));
	}
	open_tabs[tab_index] = new_tab;
	var tab_list = document.getElementById("tab_list")
	tab_container.appendChild(new_tab);
	tab_container.appendChild(close_button);
	tab_container.appendChild(document.createElement("br"));
	tab_list.appendChild(tab_container);

	$("#"+tab_index).click(function() {
		var id=$(this).attr('id');
		addon.port.emit("click", id);
	});

	$("#"+tab_index+"_close").click(function() {
		addon.port.emit("close", tab_index);
	})
});

addon.port.on("update_tab", function (tab) {
	tab_index = tab["index"];
	tab_title = tab["title"];
	var tab_element = open_tabs[tab_index];
	tab_element.id = tab_index;

	if (tab_title.length > 30)
	{
		tab_title_replacement = tab_title.substring(0, 27)+"...";
		tab_element.appendChild(document.createTextNode(tab_title_replacement));
	}
	else
	{
		tab_element.appendChild(document.createTextNode(tab_title));
	}

	$("#"+tab_index).click(function() {
		var id=$(this).attr('id');
		addon.port.emit("id", id);
	});
});

addon.port.on("remove_tab", function (tab) {
	tab_index = tab["index"];
	tab_title = tab["title"];
	document.getElementById("tab_list").removeChild(document.getElementById(tab_index));
})
