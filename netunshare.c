#define _GNU_SOURCE
#include <sched.h>
#include <unistd.h>
#include <stdio.h>
#include <errno.h>

#ifndef CLONE_NEWNET
#error CLONE_NEWNET not defined
#endif

int main(int argc, char *argv[])
{	
	if (argc < 1) {
		fprintf(stderr, "usage: %s <command> [<args...>]\n",
			basename(argv[0]));
		return 1;
	}
	argv++;

	if (unshare(CLONE_NEWNET) == -1) {
		perror("unshare");
		return 1;
	} 
	
	execv(argv[0], argv);
	/* Failed... */
	perror("execve");
	return 1;
}

