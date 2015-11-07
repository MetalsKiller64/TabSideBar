
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
	var new_tab = document.createElement("button");
	//new_tab.onClick = "javascript:blah()";
	new_tab.id = tab_index;
	if (tab_title.length > 30)
	{
		tab_title_replacement = tab_title.substring(0, 27)+"...";
		new_tab.appendChild(document.createTextNode(tab_title_replacement));
	}
	else
	{
		//new_tab.innerHTML = tab_title;
		new_tab.appendChild(document.createTextNode(tab_title));
	}
	open_tabs[tab_index] = new_tab;
	document.getElementById("tab_list").appendChild(new_tab);
	document.getElementById("tab_list").appendChild(document.createElement("br"));

	$("#"+tab_index).click(function() {
		var id=$(this).attr('id');
		addon.port.emit("id", id);
	});
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
