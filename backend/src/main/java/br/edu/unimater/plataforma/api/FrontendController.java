package br.edu.unimater.plataforma.api;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {
    @GetMapping({"/","/nova","/execucoes","/execucoes/{id:[0-9]+}","/metricas","/conversas/{id:[0-9]+}"})
    public String index() { return "forward:/index.html"; }
}
