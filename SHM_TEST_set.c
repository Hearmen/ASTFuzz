// compile with 
// gcc -o SHM_TEST_set SHM_TEST_set.c -lrt
// run fuzzilli patched javascript engine with environmentvariable SHM_ID=/SHM_TEST

#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <signal.h>

#define STORAGE_ID "/SHM_TEST"
#define STORAGE_SIZE 0x100000
#define DATA "Hello, World! From PID %d 0000000000000"

int go_on = 1;
void handle_sigint(int sigint) {
    go_on = 0;
}

int main(int argc, char *argv[])
{
	int res;
	int fd;
	int len;
	pid_t pid;
	void *addr;
	char data[STORAGE_SIZE];
    char* shm_key = getenv("SHM_ID");
    signal(SIGINT, handle_sigint);    
    signal(SIGTERM, handle_sigint);    
    //signal(SIGABRT, handle_sigint);    
    //signal(SIGKILL, handle_sigint);    
    
	pid = getpid();
	sprintf(data, DATA, pid);

	// get shared memory file descriptor (NOT a file)
	if (shm_key)
        fd = shm_open(shm_key, O_RDWR | O_CREAT, S_IRUSR | S_IWUSR);
    else
        fd = shm_open(STORAGE_ID, O_RDWR | O_CREAT, S_IRUSR | S_IWUSR);

	if (fd == -1)
	{
		perror("open");
		return 10;
	}

	// extend shared memory object as by default it's initialized with size 0
	res = ftruncate(fd, STORAGE_SIZE);
	if (res == -1)
	{
		perror("ftruncate");
		return 20;
	}

	// map shared memory to process address space
	addr = mmap(NULL, STORAGE_SIZE, PROT_WRITE, MAP_SHARED, fd, 0);
	if (addr == MAP_FAILED)
	{
		perror("mmap");
		return 30;
	}

	// place data into memory
	len = strlen(data) + 1;
	memcpy(addr, data, STORAGE_SIZE);

	// wait for someone to read it
	while (go_on)
        sleep(1);

	// mmap cleanup
	res = munmap(addr, STORAGE_SIZE);
	if (res == -1)
	{
		perror("munmap");
		return 40;
	}

	// shm_open cleanup
	if (shm_key)
    	fd = shm_unlink(shm_key);
    else
    	fd = shm_unlink(STORAGE_ID);

	if (fd == -1)
	{
		perror("unlink");
		return 100;
	}

	return 0;
}
