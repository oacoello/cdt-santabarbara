#include <iostream>
#include <fstream>
#include <sstream>
#include <thread>
#include <conio.h>   // 🔥 CLAVE (_getch)
#include "httplib.h"
#include "basic_engine.h"
#include <filesystem>
#include <windows.h>
#include <vector>


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
        res.set_content(result,"text/plain");
    });

    server.Get("/", [](const httplib::Request&, httplib::Response& res)
    {


        std::ifstream file;

        // 🔥 obtener ruta REAL del exe
        char exePath[MAX_PATH];
        GetModuleFileNameA(NULL, exePath, MAX_PATH);

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
}

//////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////

int main()
{
    std::cout << "Starting HP-71B Artillery System...\n";

    engine.resetData(); // <- esto inicializa TODO y carga TABLAS de una vez
    std::thread server_thread(runServer);
    std::thread console_thread(runConsole);

    console_thread.join();

    if(server_thread.joinable())
        server_thread.detach();

    return 0;
}