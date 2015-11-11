
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
var current_active_close = null;

function highlight(id) {
	if(current_active_tab != null)
	{
		current_active_tab.removeClass("highlighted")
		current_active_tab.addClass("normal");

		current_active_close.removeClass("close_highlighted");
		current_active_close.addClass("close");
	}

	current_active_tab = $("#"+id);
	current_active_tab.removeClass("normal");
	current_active_tab.addClass("highlighted");

	current_active_close = $("#"+id+"_close");
	current_active_close.removeClass("close");
	current_active_close.addClass("close_highlighted");
}

addon.port.on("add_tab", function (tab) {
	console.log(tab)
	var tab_id = tab["id"];
	var tab_title = tab["title"];
	var subsequent_tab = tab["sub_tab"];
	var highlight_as_current = tab["highlight"];

	var tab_container = document.createElement("span");
	tab_container.id = tab_id;
	tab_container.className = "normal";

	if (tab["parent"] != undefined)
	{
		if (document.getElementById(tab["parent"]) == undefined)
		{
			console.log("parent is not ready yet");
		}
		else
		{
			//var parent_indentation = document.getElementById(tab["parent"]).style["margin-left"];
			var parent_indentation = document.getElementById(tab["parent"]).style["width"].substring(0,2);
			if (parent_indentation == "")
			{
				tab_container.style = "width: 98%";
			}
			else
			{
				//var indentation = ((parseInt(parent_indentation.substring(0,1)) + 1).toString() + "0");
				var indentation = (parseInt(parent_indentation) - 2);
				console.log("indentation: "+indentation);
				tab_container.style = "width: "+indentation+"%;";
				//tab_container.style = "margin-left: "+indentation+"px;";
			}
		}
	}
	
	var tab_icon = document.createElement("img");
	tab_icon.id = tab_id+"_icon";
	tab_icon.src = tab["icon"];
	tab_icon.className = "icon";
	
	var title_node = document.createElement("span");
	title_node.id = tab_id+"_title";
	title_node.className = "title";
	
	var close_button = document.createElement("span");
	close_button.id = tab_id+"_close";
	close_button.className = "close";
	close_button.appendChild(document.createTextNode("x"));

	title_node.appendChild(document.createTextNode(tab_title));

	open_tabs[tab_id] = {"tab_element":tab_container, "icon":tab_icon};
	var tab_list = $("#tab_list")
	tab_container.appendChild(tab_icon);
	tab_container.appendChild(title_node);
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

	$("#"+tab_id).click(function() {
		var id=$(this).attr('id');
		addon.port.emit("click", id);
	});

	$("#"+tab_id+"_close").click(function() {
		var id=$(this).attr('id').split("_")[0];
		$("#"+tab_id).unbind("click");
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
	new_title_node.className = "title";

	new_title_node.appendChild(document.createTextNode(tab_title));

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
