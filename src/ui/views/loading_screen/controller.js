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
    this.lessonGenerator.subscribeFirstTaskAppeared(this.onFisrtTaskAppeared.bind(this));
    await this.lessonGenerator.generateLesson(lessonSettings);
  }

  async onFisrtTaskAppeared() {
    console.log("Opening lesson flow page");
    await this.router.navigateTo({
      path: "/lesson",
      options: { lessonGenerator: this.lessonGenerator },
    });
  }

  async unmount() {

  }  
}
