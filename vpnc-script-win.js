// vpnc-script-win.js
//
// Sets up the Network interface and the routes
// needed by vpnc.

// --------------------------------------------------------------
// Utilities
// --------------------------------------------------------------

function echo(msg)
{
	WScript.echo(msg);
}

function run(cmd)
{
	return (ws.Exec(cmd).StdOut.ReadAll());
}

function getDefaultGateway()
{
	if (run("route print").match(/Default Gateway: *(.*)/)) {
		return (RegExp.$1);
	}
	return ("");
}

// --------------------------------------------------------------
// Script starts here
// --------------------------------------------------------------

var internal_ip4_netmask = "255.255.255.0"

var ws = WScript.CreateObject("WScript.Shell");
var env = ws.Environment("Process");

switch (env("reason")) {
case "pre-init":
	break;
case "connect":
	var gw = getDefaultGateway();
	echo("VPN Gateway: " + env("VPNGATEWAY"));
	echo("Internal Address: " + env("INTERNAL_IP4_ADDRESS"));
	echo("Internal Netmask: " + env("INTERNAL_IP4_NETMASK"));
	echo("Interface: \"" + env("TUNDEV") + "\"");

	if (env("INTERNAL_IP4_NETMASK")) {
	    internal_ip4_netmask = env("INTERNAL_IP4_NETMASK");
	}

	echo("Configuring \"" + env("TUNDEV") + "\" interface for Legacy IP...");
	run("netsh interface ip set address \"" + env("TUNDEV") + "\" static " +
	    env("INTERNAL_IP4_ADDRESS") + " " + internal_ip4_netmask);

	// Add direct route for the VPN gateway to avoid routing loops
	run("route add " + env("VPNGATEWAY") +
            " mask 255.255.255.255 " + gw);

        if (env("INTERNAL_IP4_NBNS")) {
		var wins = env("INTERNAL_IP4_NBNS").split(/ /);
		for (var i = 0; i < wins.length; i++) {
	                run("netsh interface ip add wins \"" +
			    env("TUNDEV") + "\" " + wins[i]
			    + " index=" + (i+1));
		}
	}

        if (env("INTERNAL_IP4_DNS")) {
		var dns = env("INTERNAL_IP4_DNS").split(/ /);
		for (var i = 0; i < dns.length; i++) {
	                run("netsh interface ip add dns \"" +
			    env("TUNDEV") + "\" " + dns[i]
			    + " index=" + (i+1));
		}
	}
	echo("done.");

	// Add internal network routes
        echo("Configuring Legacy IP networks:");
        if (env("CISCO_SPLIT_INC")) {
		for (var i = 0 ; i < parseInt(env("CISCO_SPLIT_INC")); i++) {
			var network = env("CISCO_SPLIT_INC_" + i + "_ADDR");
			var netmask = env("CISCO_SPLIT_INC_" + i + "_MASK");
			var netmasklen = env("CISCO_SPLIT_INC_" + i +
					 "_MASKLEN");
			run("route add " + network + " mask " + netmask +
			     " " + env("INTERNAL_IP4_ADDRESS"));
		}
	} else {
		echo("Gateway did not provide network configuration.");
		// XXX: Doesn't this mean we should set the default route to the VPN?
	}
	echo("Route configuration done.");

        if (env("INTERNAL_IP6_ADDRESS")) {
		echo("Configuring \"" + env("TUNDEV") + "\" interface for IPv6...");

		run("netsh interface ipv6 set address \"" + env("TUNDEV") + "\" " +
		    env("INTERNAL_IP6_ADDRESS") + " store=active");

		echo("done.");

		// Add internal network routes
	        echo("Configuring Legacy IP networks:");
	        if (env("INTERNAL_IP6_NETMASK") && !env("INTERNAL_IP6_NETMASK").match("/128$")) {
			run("netsh interface ipv6 add route " + env("INTERNAL_IP6_NETMASK") +
			    " \"" + env("TUNDEV") + "\" fe80::8 store=active")
		}

	        if (env("CISCO_IPV6_SPLIT_INC")) {
			for (var i = 0 ; i < parseInt(env("CISCO_IPV6_SPLIT_INC")); i++) {
				var network = env("CISCO_IPV6_SPLIT_INC_" + i + "_ADDR");
				var netmasklen = env("CISCO_SPLIT_INC_" + i +
						 "_MASKLEN");
				run("netsh interface ipv6 add route " + network + "/" +
				    netmasklen + " \"" + env("TUNDEV") + "\" fe80::8 store=active")
			}
		} else {
			echo("Setting default IPv6 route through VPN.");
			run("netsh interface ipv6 add route 2000::/3 \"" + env("TUNDEV") +
			    "\" fe80::8 store=active");
		}
		echo("IPv6 route configuration done.");
	}

	if (env("CISCO_BANNER")) {
		echo("--------------------------------------------------");
		echo(env("CISCO_BANNER"));
		echo("--------------------------------------------------");
	}
	break;
case "disconnect":
	// Delete direct route for the VPN gateway to avoid
	run("route delete " + env("VPNGATEWAY") + " mask 255.255.255.255");
}

