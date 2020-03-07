package main

import "testing"

func assertEqual(t *testing.T, expected interface{}, actual interface{}) {
	if expected != actual {
		t.Error("Expected ", expected, " but got ", actual)
		t.FailNow()
	}
}

func TestParseWithVersion(t *testing.T) {
	var cmd = parseCommand("terraform@0.11.13")
	assertEqual(t, "terraform", cmd.command)
	assertEqual(t, "0.11.13", cmd.version)
	assertEqual(t, true, cmd.hasVersion)
}

func TestParseNoVersion(t *testing.T) {
	var cmd = parseCommand("terraform")
	assertEqual(t, "terraform", cmd.command)
	assertEqual(t, "", cmd.version)
	assertEqual(t, false, cmd.hasVersion)
}

func TestToString(t *testing.T) {
	var cmd CommandVersion
	cmd.command = "alpine"
	cmd.hasVersion = false

	assertEqual(t, "alpine", cmd.toString())

	cmd.version = "123"
	cmd.hasVersion = true
	assertEqual(t, "alpine@123", cmd.toString())
}
