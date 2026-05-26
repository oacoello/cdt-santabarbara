#include <iostream>
#include <fstream>
#include <sstream>
#include <thread>
#include "httplib.h"
#include "basic_engine.h"
#include <filesystem>
#include <vector>
#include <cstdlib>
#include <cstdio>

#ifdef _WIN32
#include <conio.h>   // 🔥 CLAVE (_getch)
#include <windows.h>
#else
#include <unistd.h>
#include <limits.h>
#endif


BasicEngine engine;

//////////////////////////////////////////////////
// SERVER THREAD
//////////////////////////////////////////////////

void runServer()
{
    httplib::Server server;

    server.Post("/input",[](const httplib::Request& req, httplib::Response& res)
    {
        std::string cmd = req.get_param_value("cmd");
        std::string result = engine.execute(cmd);
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.set_content(result,"text/plain");
    });

    server.Options("/input", [](const httplib::Request&, httplib::Response& res)
    {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });

    server.Get("/", [](const httplib::Request&, httplib::Response& res)
    {


        std::ifstream file;

        // 🔥 obtener ruta REAL del exe
        char exePath[4096] = {0};

#ifdef _WIN32
        GetModuleFileNameA(NULL, exePath, MAX_PATH);
#else
        ssize_t len = readlink("/proc/self/exe", exePath, sizeof(exePath) - 1);
        if (len <= 0)
        {
            std::filesystem::path fallback = std::filesystem::current_path() / "hp71_emulator";
            std::string fallbackStr = fallback.string();
            std::snprintf(exePath, sizeof(exePath), "%s", fallbackStr.c_str());
        }
        else
        {
            exePath[len] = '\0';
        }
#endif

        // carpeta del exe
        std::filesystem::path exeDir = std::filesystem::path(exePath).parent_path();

        // 🔥 rutas posibles
        std::vector<std::filesystem::path> paths = {
            exeDir / "web_ui/index.html",
            exeDir / "../web_ui/index.html",
            exeDir / "../../web_ui/index.html",

            // 🔥 IMPORTANTE PARA ELECTRON
            exeDir / "backend/web_ui/index.html",
            exeDir / "../backend/web_ui/index.html",
            exeDir / "../../backend/web_ui/index.html"
        };

        for (auto& p : paths)
        {
            file.open(p);
            if (file.is_open())
            {
                std::cout << "Loaded index from: " << p << std::endl;
                break;
            }
        }

        if (!file.is_open())
        {
            res.set_content("ERROR: index.html not found", "text/plain");
            return;
        }
        std::string content(
            (std::istreambuf_iterator<char>(file)),
            std::istreambuf_iterator<char>()
        );

        res.set_content(content, "text/html");
    });

    std::cout << "Server running on http://127.0.0.1:8080\n";

    server.listen("127.0.0.1",8080);
}

//////////////////////////////////////////////////
// 🔥 CONSOLA REAL (NUMPAD FIX DEFINITIVO)
//////////////////////////////////////////////////

void runConsole()
{
#ifndef _WIN32
    std::string input;

    std::cout << engine.execute("*") << std::endl;

    while(true)
    {
        std::cout << "> ";
        if(!std::getline(std::cin, input))
            break;

        if(input == "EXIT" || input == "exit")
        {
            std::cout << "Closing console...\n";
            break;
        }

        if(input.empty())
            continue;

        try
        {
            std::string result = engine.execute(input);
            std::cout << result << std::endl;
        }
        catch(const std::exception& e)
        {
            std::cout << "ERROR: " << e.what() << std::endl;
        }
    }
#else
    std::string input;

    std::cout << engine.execute("*") << std::endl;

    while(true)
    {
        std::cout << "> ";
        input.clear();

        while(true)
        {
            int ch = _getch();

            // ENTER
            if(ch == 13)
            {
                std::cout << std::endl;
                break;
            }

            // BACKSPACE
            if(ch == 8)
            {
                if(!input.empty())
                {
                    input.pop_back();
                    std::cout << "\b \b";
                }
                continue;
            }

            // NUMPAD 0-9 (códigos Windows)
            if(ch >= 96 && ch <= 105)
            {
                char c = '0' + (ch - 96);
                input += c;
                std::cout << c;
                continue;
            }

            // NÚMEROS NORMALES
            if(ch >= 48 && ch <= 57)
            {
                char c = (char)ch;
                input += c;
                std::cout << c;
                continue;
            }

            // LETRAS
            if((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122))
            {
                char c = (char)ch;
                input += c;
                std::cout << c;
                continue;
            }

            // ESPACIO
            if(ch == 32)
            {
                input += ' ';
                std::cout << ' ';
                continue;
            }
        }

        if(input == "EXIT" || input == "exit")
        {
            std::cout << "Closing console...\n";
            break;
        }

        if(input.empty())
            continue;

        try
        {
            std::string result = engine.execute(input);
            std::cout << result << std::endl;
        }
        catch(const std::exception& e)
        {
            std::cout << "ERROR: " << e.what() << std::endl;
        }
    }
#endif
}

//////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////

int main()
{
    std::cout << "Starting HP-71B Artillery System...\n";

    engine.resetData(); // <- esto inicializa TODO y carga TABLAS de una vez

    const char* headless = std::getenv("CDT_HP71_HEADLESS");
    if(headless && std::string(headless) == "1")
    {
        runServer();
        return 0;
    }

    std::thread server_thread(runServer);
    std::thread console_thread(runConsole);

    console_thread.join();

    if(server_thread.joinable())
        server_thread.detach();

    return 0;
}
