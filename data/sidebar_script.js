
addon.port.emit("ping");

addon.port.on("pong", function() {
	console.log("sidebar script got the reply");
	open_tabs = {};
});

addon.port.on("highlight", function (id) {
	highlight(id);
})

var open_tabs = {};

var current_active_tab = null;

function highlight(id) {
	if(current_active_tab != null)
	{
		current_active_tab.className = "";
	}

	current_active_tab = document.getElementById(id+"_activate");
	current_active_tab.className = "highlighted"
}

addon.port.on("add_tab", function (tab) {
	console.log(tab)
	var tab_id = tab["id"];
	var tab_title = tab["title"];
	var subsequent_tab = tab["sub_tab"];
	var highlight_as_current = tab["highlight"];

	var tab_container = document.createElement("span");
	tab_container.id = tab_id;
	if (tab["parent"] != undefined)
	{
		if (document.getElementById(tab["parent"]) == undefined)
		{
			console.log("parent is not ready yet");
		}
		else
		{
			var parent_indentation = document.getElementById(tab["parent"]).style["margin-left"];
			if (parent_indentation == "")
			{
				tab_container.style = "margin-left: 10px;";
			}
			else
			{
				var indentation = ((parseInt(parent_indentation.substring(0,1)) + 1).toString() + "0");
				console.log("indentation: "+indentation);
				tab_container.style = "margin-left: "+indentation+"px;";
			}
		}
	}
	
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
	if (subsequent_tab != undefined)
	{
		//tab_list.insertBefore(tab_container, document.getElementById(subsequent_tab));
		$("#"+subsequent_tab).before(tab_container);
	}
	else
	{
		tab_list.append(tab_container);
	}

	$("#"+tab_id+"_activate").click(function() {
		var id=$(this).attr('id').split("_")[0];
		addon.port.emit("click", id);
	});

	$("#"+tab_id+"_close").click(function() {
		var id=$(this).attr('id').split("_")[0];
		addon.port.emit("close", id);
	})

	if (highlight_as_current != undefined)
	{
		highlight(highlight_as_current);
	}
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

	//highlight(tab_id);
});

addon.port.on("remove_tab", function (tab) {
	tab_id = tab["id"];
	tab_title = tab["title"];
	open_tabs[tab_id] = undefined;
	document.getElementById("tab_list").removeChild(document.getElementById(tab_id));
})
