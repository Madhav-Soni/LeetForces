/**
 * Default boilerplate code per language family.
 * Each template contains a single "$CURSOR$" marker showing where the
 * cursor should land after the boilerplate loads. getBoilerplate() strips
 * the marker and returns the clean code plus its character offset.
 */

export const BOILERPLATE_MAP = {
    'C++': `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t = 1;
    // cin >> t;
    while (t--) {
        $CURSOR$
    }
    return 0;
}
`,

    'C': `#include <stdio.h>

int main() {
    int t = 1;
    // scanf("%d", &t);
    while (t--) {
        $CURSOR$
    }
    return 0;
}
`,

    'Java': `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();

        int t = 1;
        // t = Integer.parseInt(br.readLine().trim());
        while (t-- > 0) {
            $CURSOR$
        }

        System.out.print(sb);
    }
}
`,

    'C#': `using System;
using System.IO;

class Program {
    static void Main() {
        int t = 1;
        // t = int.Parse(Console.ReadLine());
        while (t-- > 0) {
            $CURSOR$
        }
    }
}
`,

    'Go': `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    writer := bufio.NewWriter(os.Stdout)
    defer writer.Flush()

    t := 1
    // fmt.Fscan(reader, &t)
    for ; t > 0; t-- {
        $CURSOR$
    }
    _ = reader
}
`,

    'Kotlin': `import java.io.BufferedReader
import java.io.InputStreamReader

fun main() {
    val br = BufferedReader(InputStreamReader(System.\`in\`))

    var t = 1
    // t = br.readLine().trim().toInt()
    while (t-- > 0) {
        $CURSOR$
    }
}
`,

    'Swift': `import Foundation

var t = 1
// t = Int(readLine()!)!
while t > 0 {
    $CURSOR$
    t -= 1
}
`,

    'Rust': `use std::io::{self, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    let mut t = 1;
    // t = input.trim().parse().unwrap();
    while t > 0 {
        $CURSOR$
        t -= 1;
    }
}
`,

    'Scala': `import scala.io.StdIn._

object Main extends App {
    var t = 1
    // t = readInt()
    while (t > 0) {
        $CURSOR$
        t -= 1
    }
}
`,

    'Python3': `import sys
input = sys.stdin.readline

t = 1
# t = int(input())
for _ in range(t):
    $CURSOR$
`,

    'Python': `import sys
input = sys.stdin.readline

t = 1
# t = int(input())
for _ in range(t):
    $CURSOR$
`,

    'JavaScript': `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');
let idx = 0;
const readLine = () => lines[idx++];

let t = 1;
// t = parseInt(readLine());
while (t--) {
    $CURSOR$
}
`,

    'TypeScript': `const lines: string[] = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');
let idx = 0;
const readLine = (): string => lines[idx++];

let t = 1;
// t = parseInt(readLine());
while (t--) {
    $CURSOR$
}
`,

    'Ruby': `t = 1
# t = gets.to_i
t.times do
  $CURSOR$
end
`,

    'PHP': `<?php
$stdin = fopen('php://stdin', 'r');

$t = 1;
// $t = intval(fgets($stdin));
while ($t--) {
    $CURSOR$
}
`,

    'Dart': `import 'dart:io';

void main() {
    var t = 1;
    // t = int.parse(stdin.readLineSync()!);
    while (t-- > 0) {
        $CURSOR$
    }
}
`,

    'Elixir': `defmodule Main do
  def main do
    t = 1
    # t = IO.gets("") |> String.trim() |> String.to_integer()
    Enum.each(1..t, fn _ ->
      $CURSOR$
    end)
  end
end

Main.main()
`,

    'Erlang': `-module(main).
-export([main/0]).

main() ->
    T = 1,
    %% T = list_to_integer(io:get_line("")),
    loop(T).

loop(0) -> ok;
loop(T) ->
    $CURSOR$
    loop(T - 1).
`,

    'Racket': `#lang racket

(define t 1)
;; (define t (read))
(for ([i (in-range t)])
  $CURSOR$)
`
};

/**
 * Returns the boilerplate for a language family with the cursor marker
 * stripped out.
 * @param {string} languageFamily - key into BOILERPLATE_MAP
 * @returns {{ code: string, cursorOffset: number } | null}
 */
export function getBoilerplate(languageFamily) {
    const template = BOILERPLATE_MAP[languageFamily];
    if (!template) return null;

    const marker = '$CURSOR$';
    const markerIndex = template.indexOf(marker);

    if (markerIndex === -1) {
        return { code: template, cursorOffset: template.length };
    }

    const code = template.slice(0, markerIndex) + template.slice(markerIndex + marker.length);
    return { code, cursorOffset: markerIndex };
}