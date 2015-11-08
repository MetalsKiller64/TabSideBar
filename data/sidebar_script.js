
addon.port.emit("ping");

addon.port.on("pong", function() {
	console.log("sidebar script got the reply");
});

var open_tabs = {};

addon.port.on("add_tab", function (tab) {
	console.log(tab)
	tab_id = tab["id"];
	tab_title = tab["title"];
	var tab_container = document.createElement("span");
	tab_container.id = tab_id;
	
	var tab_icon = document.createElement("img");
	tab_icon.id = tab_id+"_icon";
	tab_icon.src = tab["icon"];
	tab_icon.style.height = '15px';
	tab_icon.style.width = '15px';

	var new_tab = document.createElement("button");
	new_tab.id = tab_id+"_activate";
	
	var title_node = document.createElement("span");
	title_node.id = tab_id+"_title";
	
	var close_button = document.createElement("button");
	close_button.id = tab_id+"_close";
	close_button.appendChild(document.createTextNode("x"));

	if (tab_title.length > 30)
	{
		tab_title_replacement = tab_title.substring(0, 27)+"...";
		title_node.appendChild(document.createTextNode(tab_title_replacement));
	}
	else
	{
		title_node.appendChild(document.createTextNode(tab_title));
	}

	open_tabs[tab_id] = {"tab_element":new_tab, "icon":tab_icon};
	var tab_list = $("#tab_list")
	new_tab.appendChild(title_node);
	tab_container.appendChild(tab_icon);
	tab_container.appendChild(new_tab);
	tab_container.appendChild(close_button);
	tab_container.appendChild(document.createElement("br"));
	tab_list.append(tab_container);

	$("#"+tab_id+"_activate").click(function() {
		var id=$(this).attr('id').split("_")[0];
		addon.port.emit("click", id);
	});

	$("#"+tab_id+"_close").click(function() {
		var id=$(this).attr('id').split("_")[0];
		addon.port.emit("close", id);
	})
});

addon.port.on("update_tab", function (tab) {
	tab_id = tab["id"];
	tab_title = tab["title"];

	var tab_element = open_tabs[tab_id]["tab_element"];
	
	var tab_icon = open_tabs[tab_id]["icon"];
	var old_icon_src = tab_icon.src;
	var new_icon_src = tab["icon"];
	if (old_icon_src != new_icon_src)
	{
		tab_icon.src = new_icon_src;
	}

	var old_title_node = document.getElementById(tab_id+"_title");
	old_title_node.id = "old";
	var new_title_node = document.createElement("span");
	new_title_node.id = tab_id+"_title";

	if (tab_title.length > 30)
	{
		tab_title_replacement = tab_title.substring(0, 27)+"...";
		new_title_node.appendChild(document.createTextNode(tab_title_replacement));
	}
	else
	{
		new_title_node.appendChild(document.createTextNode(tab_title));
	}

	tab_element.replaceChild(new_title_node, old_title_node);
	$("#"+tab_id+"_activate").click(function() {
		var id=$(this).attr('id').split("_")[0];
		addon.port.emit("click", id);
	});

	$("#"+tab_id+"_close").click(function() {
		var id=$(this).attr('id').split("_")[0];
		addon.port.emit("close", id);
	});
});

addon.port.on("remove_tab", function (tab) {
	tab_id = tab["id"];
	tab_title = tab["title"];
	open_tabs[tab_id] = undefined;
	document.getElementById("tab_list").removeChild(document.getElementById(tab_id));
})
