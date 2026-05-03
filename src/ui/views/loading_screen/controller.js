import { DefaultLessonGenerator } from "../../../lesson-generators/default-lesson-generator.js";

const elements = {
  btnStop: document.getElementById("btn-stop"),
};

export class Controller {
  constructor() {
    this.router;
    this.lessonGenerator;
  }

  async mount(router, lessonSettings = {}) {
    this.router = router;
    this.lessonGenerator = new DefaultLessonGenerator();
    this.lessonGenerator.subscribeFirstTaskAppeared(this.onFisrtTaskAppeared);
    this.lessonGenerator.subscribeNewTaskAppeared(this.onNewTaskAppeared);
    this.lessonGenerator.generateLesson(lessonSettings);
  }

  onFisrtTaskAppeared() {
    console.log("First task");
  }

  onNewTaskAppeared() {
    console.log("New task");
  }

  async unmount() {

  }  
}
