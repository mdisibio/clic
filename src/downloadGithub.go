package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path"
)

type githublisting struct {
	Path        string
	DownloadURL string `json:"download_url"`
}

func downloadFile(filepath string, url string) (err error) {

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Writer the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	return nil
}

func getListing(src string) ([]githublisting, error) {

	resp, err := http.Get(src)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	listings := make([]githublisting, 0)
	err = json.Unmarshal(body, &listings)
	if err != nil {
		return nil, err
	}

	return listings, nil
}

func downloadGithub(repoName string, repoFolder string, dstFolder string) error {

	url := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s", repoName, repoFolder)

	listings, err := getListing(url)
	if err != nil {
		return err
	}

	fmt.Printf("Downloading %s/%s to %s\n", repoName, repoFolder, dstFolder)

	for _, l := range listings {
		dst := path.Join(dstFolder, l.Path)
		//fmt.Println("Downloading", l.DownloadURL, "to", dst)
		fmt.Print(".")

		err = downloadFile(dst, l.DownloadURL)
		if err != nil {
			return err
		}
	}

	fmt.Println()

	return nil
}
