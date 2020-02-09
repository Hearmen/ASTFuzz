//compile with gcc -o SHM_TEST_get SHM_TEST_get.c -lrt

#include <stdio.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <stdint.h>

#define STORAGE_ID "/SHM_TEST"
#define STORAGE_SIZE 0x100000

struct shmem_data {
    uint32_t num_edges;
    unsigned char edges[];
};


int main(int argc, char *argv[])
{
	int res;
	int fd;
	char data[STORAGE_SIZE];
	struct shmem_data* data1;
	pid_t pid;
	void *addr;

	pid = getpid();

	// get shared memory file descriptor (NOT a file)
	fd = shm_open(STORAGE_ID, O_RDONLY, S_IRUSR | S_IWUSR);
	if (fd == -1)
	{
		perror("open");
		return 10;
	}

	// map shared memory to process address space
	addr = mmap(NULL, STORAGE_SIZE, PROT_READ, MAP_SHARED, fd, 0);
	if (addr == MAP_FAILED)
	{
		perror("mmap");
		return 30;
	}

	// place data into memory
	//memcpy(data, addr, STORAGE_SIZE);
	data1 = addr;
    int counter=0;
	printf("Size %u\n",  (*data1).num_edges);
	for (int i=0;i<data1->num_edges;i++) {
		if (0 != data1->edges[i / 8] && (1 << (i % 8))) {
            //printf("cov\n");
            counter++;
        }
        //else
        //    printf("-\n");
    }
    printf(" %d / %u --> %6.2f\n",counter,data1->num_edges,100.0 * counter / data1->num_edges );
	return 0;
}
